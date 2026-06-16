export function PrivacyNote() {
  return (
    <aside className="privacy" aria-label="Privacy information">
      <strong>100% local.</strong> Your audio is decoded and transcribed entirely in this
      browser tab — it is never uploaded anywhere. The only network request is a one-time
      download of the Whisper model from Hugging Face, which is then cached. After that,
      this tool works fully offline.
    </aside>
  );
}
