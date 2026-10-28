/**
 * Dialog konfirmasi untuk aksi yang MERUSAK data (hapus objek, import yang
 * menimpa scene). Permintaan user 2026-10-28: "berikan peringatan dan
 * konfirmasi jika ingin menghapus".
 *
 * Tombol aman (BATAL) selalu di kiri dan tidak pernah jadi tombol utama;
 * tombol merusak berwarna merah dan harus diketuk secara sadar.
 */
export interface ConfirmReq {
  title: string
  lines: string[]
  confirmLabel: string
  /** true = aksi merusak (merah) */
  danger?: boolean
  onConfirm: () => void
}

export default function Confirm(p: ConfirmReq & { onCancel: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="mcard confirm">
        <div className="mhead">
          <span className={p.danger ? 'cwarn' : ''}>⚠ {p.title}</span>
          <button className="sbtn" onClick={p.onCancel} title="tutup">✕</button>
        </div>

        <div className="cbody">
          {p.lines.map((t, i) => (
            <div key={i} className={i === 0 ? 'cline strong' : 'cline'}>{t}</div>
          ))}
        </div>

        <div className="cfoot">
          <button className="sbtn wide" onClick={p.onCancel}>BATAL</button>
          <button
            className={p.danger ? 'sbtn wide danger' : 'sbtn wide on'}
            onClick={p.onConfirm}
            autoFocus
          >
            {p.confirmLabel}
          </button>
        </div>
        <div className="chint">tip: setelah dihapus, tombol URUNGKAN muncul ±8 detik</div>
      </div>
    </div>
  )
}
