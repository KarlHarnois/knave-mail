use crate::calendar::CivilDate;

const MILLISECONDS_PER_DAY: i64 = 86_400_000;
const MINUTES_PER_DAY: i64 = 1_440;
const MILLISECONDS_PER_MINUTE: i64 = 60_000;
const BEFORE_OPERATOR: &str = "before:";

pub fn utc_milliseconds_after(text: &str, marker: &str) -> Option<i64> {
    let start = text.find(marker)? + marker.len();
    utc_milliseconds(&text[start..])
}

fn utc_milliseconds(stamp: &str) -> Option<i64> {
    let field = |from: usize, to: usize| {
        stamp
            .get(from..to)
            .and_then(|digits| digits.parse::<i64>().ok())
    };
    let (year, month, day) = (field(0, 4)?, field(5, 7)?, field(8, 10)?);
    let (hour, minute, second) = (field(11, 13)?, field(14, 16)?, field(17, 19)?);
    let fraction = if stamp.get(19..20) == Some(".") {
        field(20, 23).unwrap_or(0)
    } else {
        0
    };
    let days = CivilDate { year, month, day }.unix_days();
    Some((((days * 24 + hour) * 60 + minute) * 60 + second) * 1000 + fraction)
}

pub fn before_cutoff(query: &str) -> Option<i64> {
    let date = query
        .split_whitespace()
        .find_map(|term| term.strip_prefix(BEFORE_OPERATOR))?;
    let parts: Vec<i64> = date
        .split(['/', '-'])
        .filter_map(|part| part.parse().ok())
        .collect();
    let (&year, &month, &day) = (parts.first()?, parts.get(1)?, parts.get(2)?);
    Some(CivilDate { year, month, day }.unix_days() * MILLISECONDS_PER_DAY)
}

pub fn gmail_date(text: &str) -> Option<String> {
    let parts: Vec<&str> = text.trim().split(['/', '-']).collect();
    match parts.as_slice() {
        [year, month, day]
            if year.len() == 4
                && month.len() <= 2
                && day.len() <= 2
                && [year, month, day].iter().all(|part| is_number(part)) =>
        {
            Some(format!("{}/{:0>2}/{:0>2}", year, month, day))
        }
        _ => None,
    }
}

fn is_number(text: &str) -> bool {
    !text.is_empty() && text.chars().all(|character| character.is_ascii_digit())
}

pub fn date_text(milliseconds: i64) -> String {
    let minutes = milliseconds.div_euclid(MILLISECONDS_PER_MINUTE);
    let date = CivilDate::from_unix_days(minutes.div_euclid(MINUTES_PER_DAY));
    let of_day = minutes.rem_euclid(MINUTES_PER_DAY);
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}",
        date.year,
        date.month,
        date.day,
        of_day / 60,
        of_day % 60
    )
}
