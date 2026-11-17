use std::iter::Peekable;
use std::str::Chars;

pub fn percent_decoded(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match escaped_byte(bytes.get(index..index + 3)) {
            Some(byte) => {
                decoded.push(byte);
                index += 3;
            }
            None => {
                decoded.push(bytes[index]);
                index += 1;
            }
        }
    }
    String::from_utf8_lossy(&decoded).into_owned()
}

fn escaped_byte(window: Option<&[u8]>) -> Option<u8> {
    match window {
        Some([b'%', high, low]) => hex_digit(*high)
            .zip(hex_digit(*low))
            .map(|(high, low)| high * 16 + low),
        _ => None,
    }
}

fn hex_digit(digit: u8) -> Option<u8> {
    (digit as char).to_digit(16).map(|value| value as u8)
}

pub fn sexp_tokens(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut characters = text.chars().peekable();
    while let Some(character) = characters.next() {
        match character {
            '(' | ')' => tokens.push(character.to_string()),
            ';' => skip_comment(&mut characters),
            '"' => tokens.push(quoted_token(&mut characters)),
            blank if blank.is_whitespace() => {}
            first => tokens.push(atom_token(first, &mut characters)),
        }
    }
    tokens
}

fn skip_comment(characters: &mut Peekable<Chars>) {
    for character in characters.by_ref() {
        if character == '\n' {
            break;
        }
    }
}

fn quoted_token(characters: &mut Peekable<Chars>) -> String {
    let mut token = String::from("\"");
    for character in characters.by_ref() {
        if character == '"' {
            break;
        }
        token.push(character);
    }
    token
}

fn atom_token(first: char, characters: &mut Peekable<Chars>) -> String {
    let mut atom = first.to_string();
    while let Some(&next) = characters.peek() {
        if next.is_whitespace() || next == '(' || next == ')' {
            break;
        }
        atom.push(next);
        characters.next();
    }
    atom
}
