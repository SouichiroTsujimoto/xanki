use crate::error::AppResult;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncMeta {
    pub last_seq: i64,
    pub device_id: String,
    pub last_sync_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingUpload {
    pub hash: String,
    pub size: i64,
    pub mime: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "table", rename_all = "snake_case")]
pub enum SyncRowPayload {
    Decks {
        id: String,
        name: String,
        created_at: i64,
        updated_at: i64,
        deleted_at: Option<i64>,
    },
    Cards {
        id: String,
        deck_id: String,
        kind: String,
        content: Option<String>,
        answer: Option<String>,
        image_hash: Option<String>,
        ocr_text: Option<String>,
        ocr_data: Option<String>,
        masks: String,
        note: Option<String>,
        source_hint: Option<String>,
        starred: i32,
        created_at: i64,
        updated_at: i64,
        deleted_at: Option<i64>,
    },
    ReviewState {
        id: String,
        card_id: String,
        #[serde(rename = "box")]
        box_num: i32,
        due_at: i64,
        last_result: Option<i32>,
        updated_at: i64,
    },
    ReviewLogs {
        id: String,
        card_id: String,
        result: i32,
        reviewed_at: i64,
    },
}

pub fn get_sync_meta(conn: &Connection) -> AppResult<SyncMeta> {
    let row = conn.query_row(
        "SELECT last_seq, device_id, last_sync_ms FROM sync_meta WHERE id = 1",
        [],
        |row| {
            Ok(SyncMeta {
                last_seq: row.get(0)?,
                device_id: row.get(1)?,
                last_sync_ms: row.get(2)?,
            })
        },
    )?;
    if row.device_id.is_empty() {
        let device_id = Uuid::now_v7().to_string();
        conn.execute(
            "UPDATE sync_meta SET device_id = ?1 WHERE id = 1",
            params![device_id],
        )?;
        return Ok(SyncMeta {
            device_id,
            ..row
        });
    }
    Ok(row)
}

pub fn set_sync_meta(conn: &Connection, last_seq: i64, last_sync_ms: i64) -> AppResult<()> {
    conn.execute(
        "UPDATE sync_meta SET last_seq = ?1, last_sync_ms = ?2 WHERE id = 1",
        params![last_seq, last_sync_ms],
    )?;
    Ok(())
}

pub fn list_pending_uploads(conn: &Connection) -> AppResult<Vec<PendingUpload>> {
    let mut stmt = conn.prepare(
        "SELECT hash, size, mime, created_at FROM pending_uploads ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PendingUpload {
                hash: row.get(0)?,
                size: row.get(1)?,
                mime: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn add_pending_upload(
    conn: &Connection,
    hash: &str,
    size: i64,
    mime: &str,
    created_at: i64,
) -> AppResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO pending_uploads (hash, size, mime, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![hash, size, mime, created_at],
    )?;
    Ok(())
}

pub fn remove_pending_upload(conn: &Connection, hash: &str) -> AppResult<()> {
    conn.execute("DELETE FROM pending_uploads WHERE hash = ?1", params![hash])?;
    Ok(())
}

pub fn collect_changes(conn: &Connection, since_ms: i64) -> AppResult<Vec<SyncRowPayload>> {
    let mut changes = Vec::new();

    let mut decks = conn.prepare(
        "SELECT id, name, created_at, updated_at, deleted_at FROM decks WHERE updated_at >= ?1",
    )?;
    for row in decks.query_map(params![since_ms], |row| {
        Ok(SyncRowPayload::Decks {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
            deleted_at: row.get(4)?,
        })
    })? {
        changes.push(row?);
    }

    let mut cards = conn.prepare(
        "SELECT id, deck_id, kind, content, answer, image_hash, ocr_text, ocr_data, masks, note, source_hint, starred, created_at, updated_at, deleted_at
         FROM cards WHERE updated_at >= ?1",
    )?;
    for row in cards.query_map(params![since_ms], |row| {
        Ok(SyncRowPayload::Cards {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            kind: row.get(2)?,
            content: row.get(3)?,
            answer: row.get(4)?,
            image_hash: row.get(5)?,
            ocr_text: row.get(6)?,
            ocr_data: row.get(7)?,
            masks: row.get(8)?,
            note: row.get(9)?,
            source_hint: row.get(10)?,
            starred: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
            deleted_at: row.get(14)?,
        })
    })? {
        changes.push(row?);
    }

    let mut review_state = conn.prepare(
        "SELECT card_id, box, due_at, last_result, updated_at FROM review_state WHERE updated_at >= ?1",
    )?;
    for row in review_state.query_map(params![since_ms], |row| {
        let card_id: String = row.get(0)?;
        Ok(SyncRowPayload::ReviewState {
            id: card_id.clone(),
            card_id,
            box_num: row.get(1)?,
            due_at: row.get(2)?,
            last_result: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })? {
        changes.push(row?);
    }

    let mut logs = conn.prepare(
        "SELECT id, card_id, result, reviewed_at FROM review_logs WHERE reviewed_at >= ?1",
    )?;
    for row in logs.query_map(params![since_ms], |row| {
        Ok(SyncRowPayload::ReviewLogs {
            id: row.get(0)?,
            card_id: row.get(1)?,
            result: row.get(2)?,
            reviewed_at: row.get(3)?,
        })
    })? {
        changes.push(row?);
    }

    Ok(changes)
}

pub fn apply_remote_row(conn: &Connection, row: &SyncRowPayload) -> AppResult<()> {
    match row {
        SyncRowPayload::Decks {
            id,
            name,
            created_at,
            updated_at,
            deleted_at,
        } => {
            conn.execute(
                "INSERT INTO decks (id, name, created_at, updated_at, deleted_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   updated_at = excluded.updated_at,
                   deleted_at = excluded.deleted_at
                 WHERE excluded.updated_at >= decks.updated_at",
                params![id, name, created_at, updated_at, deleted_at],
            )?;
        }
        SyncRowPayload::Cards {
            id,
            deck_id,
            kind,
            content,
            answer,
            image_hash,
            ocr_text,
            ocr_data,
            masks,
            note,
            source_hint,
            starred,
            created_at,
            updated_at,
            deleted_at,
        } => {
            conn.execute(
                "INSERT INTO cards (id, deck_id, kind, content, answer, image_hash, ocr_text, ocr_data, masks, note, source_hint, starred, created_at, updated_at, deleted_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
                 ON CONFLICT(id) DO UPDATE SET
                   deck_id = excluded.deck_id,
                   kind = excluded.kind,
                   content = excluded.content,
                   answer = excluded.answer,
                   image_hash = excluded.image_hash,
                   ocr_text = excluded.ocr_text,
                   ocr_data = excluded.ocr_data,
                   masks = excluded.masks,
                   note = excluded.note,
                   source_hint = excluded.source_hint,
                   starred = excluded.starred,
                   updated_at = excluded.updated_at,
                   deleted_at = excluded.deleted_at
                 WHERE excluded.updated_at >= cards.updated_at",
                params![
                    id,
                    deck_id,
                    kind,
                    content,
                    answer,
                    image_hash,
                    ocr_text,
                    ocr_data,
                    masks,
                    note,
                    source_hint,
                    starred,
                    created_at,
                    updated_at,
                    deleted_at
                ],
            )?;
        }
        SyncRowPayload::ReviewState {
            id,
            card_id,
            box_num,
            due_at,
            last_result,
            updated_at,
        } => {
            conn.execute(
                "INSERT INTO review_state (card_id, box, due_at, last_result, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(card_id) DO UPDATE SET
                   box = excluded.box,
                   due_at = excluded.due_at,
                   last_result = excluded.last_result,
                   updated_at = excluded.updated_at
                 WHERE excluded.updated_at >= review_state.updated_at",
                params![card_id, box_num, due_at, last_result, updated_at],
            )?;
            let _ = id;
        }
        SyncRowPayload::ReviewLogs {
            id,
            card_id,
            result,
            reviewed_at,
        } => {
            conn.execute(
                "INSERT OR IGNORE INTO review_logs (id, card_id, result, reviewed_at) VALUES (?1, ?2, ?3, ?4)",
                params![id, card_id, result, reviewed_at],
            )?;
        }
    }
    Ok(())
}

pub fn image_hashes_needing_upload(conn: &Connection) -> AppResult<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT c.image_hash, c.image_path FROM cards c
         LEFT JOIN pending_uploads p ON p.hash = c.image_hash
         WHERE c.kind = 'image' AND c.deleted_at IS NULL
           AND c.image_hash IS NOT NULL AND c.image_hash != ''
           AND p.hash IS NULL",
    )?;
    let rows = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}
