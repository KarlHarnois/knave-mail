const DAYS_PER_ERA: i64 = 146_097;
const YEARS_PER_ERA: i64 = 400;
const DAYS_FROM_YEAR_ZERO_TO_UNIX_EPOCH: i64 = 719_468;

pub struct CivilDate {
    pub year: i64,
    pub month: i64,
    pub day: i64,
}

impl CivilDate {
    pub fn from_unix_days(days: i64) -> CivilDate {
        let shifted = days + DAYS_FROM_YEAR_ZERO_TO_UNIX_EPOCH;
        let era = shifted.div_euclid(DAYS_PER_ERA);
        let day_of_era = shifted - era * DAYS_PER_ERA;
        let year_of_era =
            (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
        let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
        let month_index = (5 * day_of_year + 2) / 153;
        let day = day_of_year - (153 * month_index + 2) / 5 + 1;
        let month = if month_index < 10 {
            month_index + 3
        } else {
            month_index - 9
        };
        let year = year_of_era + era * YEARS_PER_ERA + if month <= 2 { 1 } else { 0 };
        CivilDate { year, month, day }
    }

    pub fn unix_days(&self) -> i64 {
        let march_year = if self.month <= 2 {
            self.year - 1
        } else {
            self.year
        };
        let era = march_year.div_euclid(YEARS_PER_ERA);
        let year_of_era = march_year - era * YEARS_PER_ERA;
        let day_of_year =
            (153 * (self.month + if self.month > 2 { -3 } else { 9 }) + 2) / 5 + self.day - 1;
        let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
        era * DAYS_PER_ERA + day_of_era - DAYS_FROM_YEAR_ZERO_TO_UNIX_EPOCH
    }
}
