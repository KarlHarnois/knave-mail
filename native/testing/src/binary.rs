use std::io::Write;
use std::process::{Command, Stdio};

const LOG_FILE_VARIABLE: &str = "KNAVE_MAIL_LOG_FILE";
const BACKEND_VARIABLE: &str = "KNAVE_MAIL_BACKEND";

pub struct BinaryRun {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub fn run_binary(
    path: &str,
    arguments: &[String],
    environment: &[(String, String)],
    input: &str,
) -> BinaryRun {
    let log_file = std::env::temp_dir().join(format!("knave-mail-test-{}.log", std::process::id()));
    let mut child = Command::new(path)
        .args(arguments)
        .env(LOG_FILE_VARIABLE, log_file)
        .envs(
            environment
                .iter()
                .map(|(name, value)| (name.as_str(), value.as_str())),
        )
        .env_remove(BACKEND_VARIABLE)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("run `knave build` before the e2e tests");
    child
        .stdin
        .take()
        .expect("stdin")
        .write_all(input.as_bytes())
        .expect("write stdin");
    let output = child.wait_with_output().expect("the binary finishes");
    BinaryRun {
        code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    }
}
