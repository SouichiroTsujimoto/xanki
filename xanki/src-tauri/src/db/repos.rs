use crate::error::{AppError, AppResult};
use crate::models::{Card, Deck, DeckExport, ReviewCard, SaveImageCardsRequest, SaveTextCardRequest, StudyFilter, UpdateImageCardRequest, UpdateTextCardRequest};
use crate::scheduler::{LeitnerScheduler, Scheduler};
use chrono::Utc;
use rusqlite::{params, Connection, Row};
use uuid::Uuid;

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

fn map_deck(row: &Row) -> rusqlite::Result<Deck> {
    Ok(Deck {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
        card_count: row.get(4)?,
    })
}

fn map_card(row: &Row) -> rusqlite::Result<Card> {
    Ok(Card {
        id: row.get(0)?,
        deck_id: row.get(1)?,
        kind: row.get(2)?,
        content: row.get(3)?,
        image_path: row.get(4)?,
        ocr_text: row.get(5)?,
        ocr_data: row.get(6)?,
        masks: row.get(7)?,
        note: row.get(8)?,
        source_hint: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        starred: row.get::<_, i32>(12).unwrap_or(0) != 0,
        box_num: row.get(13).ok(),
        due_at: row.get(14).ok(),
    })
}

const CARD_SELECT: &str = "SELECT c.id, c.deck_id, c.kind, c.content, c.image_path, c.ocr_text, c.ocr_data,
                c.masks, c.note, c.source_hint, c.created_at, c.updated_at, c.starred,
                rs.box, rs.due_at";

pub fn ensure_default_deck(conn: &Connection) -> AppResult<Deck> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM decks WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing {
        return get_deck(conn, &id);
    }

    let now = now_ms();
    let id = Uuid::now_v7().to_string();
    conn.execute(
        "INSERT INTO decks (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, "デフォルト", now, now],
    )?;
    get_deck(conn, &id)
}

pub fn list_decks(conn: &Connection) -> AppResult<Vec<Deck>> {
    let mut stmt = conn.prepare(
        "SELECT d.id, d.name, d.created_at, d.updated_at,
                (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.deleted_at IS NULL) as card_count
         FROM decks d
         WHERE d.deleted_at IS NULL
         ORDER BY d.created_at",
    )?;
    let decks = stmt
        .query_map([], map_deck)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decks)
}

pub fn get_deck(conn: &Connection, id: &str) -> AppResult<Deck> {
    conn.query_row(
        "SELECT d.id, d.name, d.created_at, d.updated_at,
                (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.deleted_at IS NULL) as card_count
         FROM decks d
         WHERE d.id = ?1 AND d.deleted_at IS NULL",
        params![id],
        map_deck,
    )
    .map_err(|_| AppError::NotFound(format!("deck {id} not found")))
}

pub fn create_deck(conn: &Connection, name: &str) -> AppResult<Deck> {
    let now = now_ms();
    let id = Uuid::now_v7().to_string();
    conn.execute(
        "INSERT INTO decks (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, now, now],
    )?;
    get_deck(conn, &id)
}

pub fn delete_deck(conn: &Connection, id: &str) -> AppResult<()> {
    let now = now_ms();
    let updated = conn.execute(
        "UPDATE decks SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("deck {id} not found")));
    }
    conn.execute(
        "UPDATE cards SET deleted_at = ?1, updated_at = ?1 WHERE deck_id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    Ok(())
}

pub fn list_cards(conn: &Connection, deck_id: Option<&str>, query: Option<&str>) -> AppResult<Vec<Card>> {
    let search = query.map(|q| format!("%{q}%"));
    let mut sql = format!(
        "{CARD_SELECT}
         FROM cards c
         LEFT JOIN review_state rs ON rs.card_id = c.id
         WHERE c.deleted_at IS NULL",
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(did) = deck_id {
        sql.push_str(" AND c.deck_id = ?");
        params.push(Box::new(did.to_string()));
    }
    if let Some(q) = search {
        sql.push_str(" AND (c.content LIKE ? OR c.note LIKE ? OR c.ocr_text LIKE ?)");
        params.push(Box::new(q.clone()));
        params.push(Box::new(q.clone()));
        params.push(Box::new(q));
    }
    sql.push_str(" ORDER BY c.created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let cards = stmt
        .query_map(param_refs.as_slice(), map_card)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(cards)
}

pub fn get_card(conn: &Connection, id: &str) -> AppResult<Card> {
    let sql = format!(
        "{CARD_SELECT}
         FROM cards c
         LEFT JOIN review_state rs ON rs.card_id = c.id
         WHERE c.id = ?1 AND c.deleted_at IS NULL",
    );
    conn.query_row(&sql, params![id], map_card)
        .map_err(|_| AppError::NotFound(format!("card {id} not found")))
}

pub fn save_text_card(conn: &Connection, req: &SaveTextCardRequest) -> AppResult<Card> {
    let now = now_ms();
    let id = Uuid::now_v7().to_string();
    let masks = serde_json::to_string(&req.masks)?;
    conn.execute(
        "INSERT INTO cards (id, deck_id, kind, content, masks, note, source_hint, created_at, updated_at)
         VALUES (?1, ?2, 'text', ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            req.deck_id,
            req.content,
            masks,
            req.note,
            req.source_hint,
            now,
            now
        ],
    )?;
    let due_at = LeitnerScheduler::initial_due_at(now);
    conn.execute(
        "INSERT INTO review_state (card_id, box, due_at) VALUES (?1, 1, ?2)",
        params![id, due_at],
    )?;
    get_card(conn, &id)
}

pub fn save_image_cards(conn: &Connection, req: &SaveImageCardsRequest) -> AppResult<Vec<Card>> {
    let mut saved = Vec::new();
    for region in &req.regions {
        let now = now_ms();
        let id = Uuid::now_v7().to_string();
        let masks = serde_json::to_string(&region.masks)?;
        conn.execute(
            "INSERT INTO cards (id, deck_id, kind, image_path, ocr_text, ocr_data, masks, note, source_hint, created_at, updated_at)
             VALUES (?1, ?2, 'image', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                id,
                req.deck_id,
                req.image_path,
                req.ocr_text,
                req.ocr_data,
                masks,
                region.note,
                req.source_hint,
                now,
                now
            ],
        )?;
        let due_at = LeitnerScheduler::initial_due_at(now);
        conn.execute(
            "INSERT INTO review_state (card_id, box, due_at) VALUES (?1, 1, ?2)",
            params![id, due_at],
        )?;
        saved.push(get_card(conn, &id)?);
    }
    Ok(saved)
}

pub fn update_text_card(conn: &Connection, req: &UpdateTextCardRequest) -> AppResult<Card> {
    let now = now_ms();
    let masks = serde_json::to_string(&req.masks)?;
    let updated = conn.execute(
        "UPDATE cards SET content = ?1, masks = ?2, note = ?3, deck_id = ?4, updated_at = ?5
         WHERE id = ?6 AND deleted_at IS NULL AND kind = 'text'",
        params![
            req.content,
            masks,
            req.note,
            req.deck_id,
            now,
            req.card_id
        ],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("card {} not found", req.card_id)));
    }
    get_card(conn, &req.card_id)
}

pub fn update_image_card(conn: &Connection, req: &UpdateImageCardRequest) -> AppResult<Card> {
    let now = now_ms();
    let masks = serde_json::to_string(&req.masks)?;
    let updated = conn.execute(
        "UPDATE cards SET masks = ?1, note = ?2, deck_id = ?3, ocr_text = ?4, ocr_data = ?5, updated_at = ?6
         WHERE id = ?7 AND deleted_at IS NULL AND kind = 'image'",
        params![
            masks,
            req.note,
            req.deck_id,
            req.ocr_text,
            req.ocr_data,
            now,
            req.card_id
        ],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("card {} not found", req.card_id)));
    }
    get_card(conn, &req.card_id)
}

pub fn update_deck(conn: &Connection, id: &str, name: &str) -> AppResult<Deck> {
    let now = now_ms();
    let updated = conn.execute(
        "UPDATE decks SET name = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![name, now, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("deck {id} not found")));
    }
    get_deck(conn, id)
}

pub fn toggle_star(conn: &Connection, card_id: &str) -> AppResult<Card> {
    conn.execute(
        "UPDATE cards SET starred = CASE starred WHEN 1 THEN 0 ELSE 1 END, updated_at = ?1
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now_ms(), card_id],
    )?;
    get_card(conn, card_id)
}

pub fn duplicate_card(conn: &Connection, card_id: &str) -> AppResult<Card> {
    let source = get_card(conn, card_id)?;
    let now = now_ms();
    let id = Uuid::now_v7().to_string();
    conn.execute(
        "INSERT INTO cards (id, deck_id, kind, content, image_path, ocr_text, ocr_data, masks, note, source_hint, starred, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            source.deck_id,
            source.kind,
            source.content,
            source.image_path,
            source.ocr_text,
            source.ocr_data,
            source.masks,
            source.note,
            source.source_hint,
            0i32,
            now,
            now
        ],
    )?;
    let due_at = LeitnerScheduler::initial_due_at(now);
    conn.execute(
        "INSERT INTO review_state (card_id, box, due_at) VALUES (?1, 1, ?2)",
        params![id, due_at],
    )?;
    get_card(conn, &id)
}

pub fn reset_card_progress(conn: &Connection, card_id: &str) -> AppResult<Card> {
    let now = now_ms();
    let due_at = LeitnerScheduler::initial_due_at(now);
    conn.execute(
        "UPDATE review_state SET box = 1, due_at = ?1, last_result = NULL WHERE card_id = ?2",
        params![due_at, card_id],
    )?;
    get_card(conn, card_id)
}

pub fn get_study_cards(
    conn: &Connection,
    deck_id: Option<&str>,
    filter: StudyFilter,
    limit: i64,
) -> AppResult<Vec<ReviewCard>> {
    let now = now_ms();
    let mut sql = format!(
        "{CARD_SELECT}
         FROM cards c
         LEFT JOIN review_state rs ON rs.card_id = c.id
         WHERE c.deleted_at IS NULL",
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    match filter {
        StudyFilter::Due => {
            sql.push_str(" AND rs.due_at IS NOT NULL AND rs.due_at <= ?");
            params.push(Box::new(now));
        }
        StudyFilter::Starred => {
            sql.push_str(" AND c.starred = 1");
        }
        StudyFilter::All => {}
    }

    if let Some(did) = deck_id {
        sql.push_str(" AND c.deck_id = ?");
        params.push(Box::new(did.to_string()));
    }

    sql.push_str(" ORDER BY c.created_at DESC LIMIT ?");
    params.push(Box::new(limit));

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let cards = stmt
        .query_map(param_refs.as_slice(), map_card)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(cards
        .into_iter()
        .map(|card| ReviewCard {
            card,
            image_url: None,
        })
        .collect())
}

pub fn export_deck(conn: &Connection, deck_id: &str) -> AppResult<DeckExport> {
    let deck = get_deck(conn, deck_id)?;
    let cards = list_cards(conn, Some(deck_id), None)?;
    Ok(DeckExport { deck, cards })
}

pub fn import_deck(conn: &Connection, export: &DeckExport) -> AppResult<Deck> {
    let now = now_ms();
    let deck_id = Uuid::now_v7().to_string();
    conn.execute(
        "INSERT INTO decks (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![deck_id, export.deck.name, now, now],
    )?;

    for card in &export.cards {
        let id = Uuid::now_v7().to_string();
        let starred = if card.starred { 1 } else { 0 };
        conn.execute(
            "INSERT INTO cards (id, deck_id, kind, content, image_path, ocr_text, ocr_data, masks, note, source_hint, starred, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                deck_id,
                card.kind,
                card.content,
                card.image_path,
                card.ocr_text,
                card.ocr_data,
                card.masks,
                card.note,
                card.source_hint,
                starred,
                now,
                now
            ],
        )?;
        let due_at = LeitnerScheduler::initial_due_at(now);
        conn.execute(
            "INSERT INTO review_state (card_id, box, due_at) VALUES (?1, 1, ?2)",
            params![id, due_at],
        )?;
    }

    get_deck(conn, &deck_id)
}

pub fn delete_card(conn: &Connection, id: &str) -> AppResult<()> {
    let now = now_ms();
    let updated = conn.execute(
        "UPDATE cards SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("card {id} not found")));
    }
    Ok(())
}

pub fn count_due_cards(conn: &Connection) -> AppResult<i64> {
    let now = now_ms();
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM review_state rs
         JOIN cards c ON c.id = rs.card_id
         WHERE c.deleted_at IS NULL AND rs.due_at <= ?1",
        params![now],
        |row| row.get(0),
    )?;
    Ok(count)
}

pub fn get_due_cards(conn: &Connection, deck_id: Option<&str>, limit: i64) -> AppResult<Vec<ReviewCard>> {
    let now = now_ms();
    let sql = if deck_id.is_some() {
        format!(
            "{CARD_SELECT}
         FROM cards c
         JOIN review_state rs ON rs.card_id = c.id
         WHERE c.deleted_at IS NULL AND rs.due_at <= ?1 AND c.deck_id = ?2
         ORDER BY rs.due_at
         LIMIT ?3"
        )
    } else {
        format!(
            "{CARD_SELECT}
         FROM cards c
         JOIN review_state rs ON rs.card_id = c.id
         WHERE c.deleted_at IS NULL AND rs.due_at <= ?1
         ORDER BY rs.due_at
         LIMIT ?2"
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let cards: Vec<Card> = if let Some(did) = deck_id {
        stmt.query_map(params![now, did, limit], map_card)?
            .collect::<Result<_, _>>()?
    } else {
        stmt.query_map(params![now, limit], map_card)?
            .collect::<Result<_, _>>()?
    };

    Ok(cards
        .into_iter()
        .map(|card| ReviewCard {
            card,
            image_url: None,
        })
        .collect())
}

pub fn submit_review(conn: &Connection, card_id: &str, result: i32) -> AppResult<()> {
    let now = now_ms();
    let (box_num,): (i32,) = conn.query_row(
        "SELECT box FROM review_state WHERE card_id = ?1",
        params![card_id],
        |row| Ok((row.get(0)?,)),
    )?;

    let scheduler = LeitnerScheduler;
    let new_box = scheduler.next_box(box_num, result == 1);
    let due_at = scheduler.due_at_for_box(new_box, now);

    conn.execute(
        "UPDATE review_state SET box = ?1, due_at = ?2, last_result = ?3 WHERE card_id = ?4",
        params![new_box, due_at, result, card_id],
    )?;

    let log_id = Uuid::now_v7().to_string();
    conn.execute(
        "INSERT INTO review_logs (id, card_id, result, reviewed_at) VALUES (?1, ?2, ?3, ?4)",
        params![log_id, card_id, result, now],
    )?;
    Ok(())
}

pub fn get_last_used_deck_id(conn: &Connection) -> AppResult<Option<String>> {
    let id: Option<String> = conn
        .query_row(
            "SELECT deck_id FROM cards WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();
    Ok(id)
}
