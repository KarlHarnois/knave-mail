const ROOT_SECTION: &str = "theme";
const SECTION_DEPTH: i32 = 2;
const ROOT_DEPTH: i32 = 1;

pub struct ThemeEntry {
    pub section: String,
    pub key: String,
    pub value: String,
}

pub fn theme_entries(tokens: &[String]) -> Result<Vec<ThemeEntry>, String> {
    let mut reader = ThemeReader::new(tokens);
    while reader.index < tokens.len() {
        reader.read_token();
    }
    reader.finish()
}

struct ThemeReader<'a> {
    tokens: &'a [String],
    index: usize,
    depth: i32,
    section: String,
    entries: Vec<ThemeEntry>,
    problem: Option<String>,
}

impl<'a> ThemeReader<'a> {
    fn new(tokens: &'a [String]) -> ThemeReader<'a> {
        ThemeReader {
            tokens,
            index: 0,
            depth: 0,
            section: String::from(ROOT_SECTION),
            entries: Vec::new(),
            problem: None,
        }
    }

    fn read_token(&mut self) {
        let token = &self.tokens[self.index];
        if token == "(" {
            self.open_list();
        } else if token == ")" {
            self.close_list();
        } else if let Some(key) = token.strip_prefix(':') {
            self.read_entry(key);
        } else {
            self.problem = Some(format!("unexpected `{}`; write :key value pairs", token));
            self.index += 1;
        }
    }

    fn open_list(&mut self) {
        self.depth += 1;
        self.index += 1;
        if let Some(head) = self.tokens.get(self.index) {
            if self.depth == SECTION_DEPTH {
                self.section = head.clone();
            } else if self.depth == ROOT_DEPTH && head != ROOT_SECTION {
                self.problem = Some(format!(
                    "the file must start with (theme ...), not ({} ...)",
                    head
                ));
            }
            self.index += 1;
        }
    }

    fn close_list(&mut self) {
        self.depth -= 1;
        if self.depth == ROOT_DEPTH {
            self.section = String::from(ROOT_SECTION);
        }
        self.index += 1;
    }

    fn read_entry(&mut self, key: &str) {
        match self.tokens.get(self.index + 1) {
            Some(value) if value != "(" && value != ")" => {
                self.entries.push(ThemeEntry {
                    section: self.section.clone(),
                    key: key.to_string(),
                    value: value.trim_start_matches('"').to_string(),
                });
                self.index += 2;
            }
            _ => {
                self.problem = Some(format!(":{} has no value", key));
                self.index += 1;
            }
        }
    }

    fn finish(mut self) -> Result<Vec<ThemeEntry>, String> {
        if self.depth != 0 {
            self.problem = Some(String::from("the parentheses do not balance"));
        }
        match self.problem {
            Some(message) => Err(message),
            None => Ok(self.entries),
        }
    }
}
