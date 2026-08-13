// OpenAIの利用不可時に内部の課金事情を出さず、手動作成への切り替えを案内する。
type AiUnavailableDialogProps = {
  onConfirm: () => void;
};

export const AiUnavailableDialog = ({ onConfirm }: AiUnavailableDialogProps) => (
  <div aria-label="AI機能を利用できません" aria-modal="true" className="modal-backdrop" role="dialog">
    <section className="modal-dialog ai-unavailable-dialog">
      <h2>AIは現在利用できません</h2>
      <p>WBSを手動で作成してください。</p>
      <div className="button-row modal-actions">
        <button autoFocus className="primary-button" onClick={onConfirm} type="button">
          OK
        </button>
      </div>
    </section>
  </div>
);
