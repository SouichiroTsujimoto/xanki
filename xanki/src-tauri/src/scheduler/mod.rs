pub trait Scheduler: Send + Sync {
    fn next_box(&self, current: i32, passed: bool) -> i32;
    fn due_at_for_box(&self, box_num: i32, now_ms: i64) -> i64;
}

const DAY_MS: i64 = 86_400_000;

pub struct LeitnerScheduler;

impl LeitnerScheduler {
    pub fn initial_due_at(now_ms: i64) -> i64 {
        now_ms
    }

    fn interval_days(box_num: i32) -> i64 {
        match box_num {
            1 => 0,
            2 => 1,
            3 => 3,
            4 => 7,
            _ => 21,
        }
    }
}

impl Scheduler for LeitnerScheduler {
    fn next_box(&self, current: i32, passed: bool) -> i32 {
        if passed {
            (current + 1).min(5)
        } else {
            1
        }
    }

    fn due_at_for_box(&self, box_num: i32, now_ms: i64) -> i64 {
        now_ms + Self::interval_days(box_num) * DAY_MS
    }
}
