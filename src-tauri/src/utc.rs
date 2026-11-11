use std::time::{SystemTime, UNIX_EPOCH};

pub struct Utc {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub hour: u32,
    pub minute: u32,
    pub second: u32,
}

pub fn now() -> Utc {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let days = secs.div_euclid(86_400);
    let rest = secs.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    Utc {
        year,
        month,
        day,
        hour: (rest / 3600) as u32,
        minute: ((rest % 3600) / 60) as u32,
        second: (rest % 60) as u32,
    }
}

/// Dosya adı damgası: 2026-11-07T00-42-05
pub fn file_stamp(value: &Utc) -> String {
    format!(
        "{:04}-{:02}-{:02}T{:02}-{:02}-{:02}",
        value.year, value.month, value.day, value.hour, value.minute, value.second
    )
}

/// 2026-11-07
pub fn day(value: &Utc) -> String {
    format!("{:04}-{:02}-{:02}", value.year, value.month, value.day)
}

// Howard Hinnant'ın days-from-civil tersi; ek bağımlılık gerektirmez.
fn civil_from_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year as i32, month as u32, day as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn epoch_and_known_dates() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(19_782), (2024, 2, 29));
        assert_eq!(civil_from_days(20_764), (2026, 11, 7));
    }

    #[test]
    fn stamps_are_zero_padded() {
        let value = Utc {
            year: 2026,
            month: 11,
            day: 7,
            hour: 9,
            minute: 5,
            second: 3,
        };
        assert_eq!(file_stamp(&value), "2026-11-07T09-05-03");
        assert_eq!(day(&value), "2026-11-07");
    }
}
