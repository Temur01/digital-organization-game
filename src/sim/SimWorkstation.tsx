import { useState } from 'react';
import { useGameStore } from '../app/store';
import { ui } from '../content/uz/ui';
import { isDecisionDone } from '../missions/engine/missionReducer';
import type { SimFile } from '../types/models';
import { Button } from '../ui/Button';
import { SimFrame } from '../ui/SimFrame';
import { ClueTarget, isFound, MarkModeToggle, useClueFinder, useMarkMode, type SimProps } from './common';
import styles from './sim.module.css';

type Tab = 'messenger' | 'files';

/** Messenjer + yuklanmalar. Fayl faqat ma’lumot — hech qachon yaratilmaydi yoki ochilmaydi. */
export function SimWorkstation({ mission, state, dispatch, onClose }: SimProps) {
  const messenger = mission.sim.messenger;
  const [tab, setTab] = useState<Tab>('messenger');
  const [showExt, setShowExt] = useState(false);
  const [markMode, setMarkMode] = useMarkMode();
  const find = useClueFinder(state, dispatch);
  const pushToast = useGameStore((s) => s.pushToast);
  if (!messenger) return null;

  const done = isDecisionDone(state, messenger.decisionId);
  const files: SimFile[] = [messenger.file, ...(mission.sim.extraFiles ?? [])];
  const decide = () => dispatch({ type: 'OPEN_DECISION', decisionId: messenger.decisionId });
  const tabs: [Tab, string][] = [
    ['messenger', ui.sim.workstation.messengerTab],
    ['files', ui.sim.workstation.filesTab],
  ];

  return (
    <SimFrame
      title={ui.sim.workstation.title}
      icon="🖥️"
      onClose={onClose}
      toolbar={<MarkModeToggle markMode={markMode} onToggle={() => setMarkMode((m) => !m)} />}
    >
      <div role="tablist" aria-label={ui.sim.workstation.title} className={styles.tabs}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={[styles.tab, tab === id ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'messenger' ? (
        <div role="tabpanel" id="panel-messenger" aria-labelledby="tab-messenger" className={styles.chat}>
          <p className={styles.chatContact}>
            <strong>{messenger.contact}</strong>{' '}
            <ClueTarget clueId={messenger.contactClueId} markMode={markMode} found={isFound(state, messenger.contactClueId)} onFind={find}>
              <span className={styles.tag}>{messenger.contactNote}</span>
            </ClueTarget>
          </p>
          {messenger.messages.map((parts, i) => (
            <p key={i} className={styles.bubble}>
              {parts.map((p, j) => (
                <ClueTarget key={j} clueId={p.clueId} markMode={markMode} found={isFound(state, p.clueId)} onFind={find}>
                  {p.text}
                </ClueTarget>
              ))}
            </p>
          ))}
          <div className={styles.fileCard}>
            <span className={styles.fileIcon} aria-hidden="true">
              PDF
            </span>
            <span>
              <span className="visually-hidden">{ui.sim.workstation.fileCard}: </span>
              <strong>{messenger.file.displayName}</strong>
              <span className={styles.muted}> · {messenger.file.size}</span>
            </span>
            <Button variant="secondary" onClick={() => setTab('files')}>
              {ui.sim.workstation.openInFiles}
            </Button>
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="panel-files" aria-labelledby="tab-files">
          <label className={styles.checkRow}>
            <input type="checkbox" checked={showExt} onChange={(e) => setShowExt(e.target.checked)} />
            <span>{ui.sim.workstation.showExtensions}</span>
          </label>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{ui.sim.workstation.name}</th>
                  <th scope="col">{ui.sim.workstation.type}</th>
                  <th scope="col">{ui.sim.workstation.size}</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {showExt ? (
                        <ClueTarget clueId={f.nameClueId} markMode={markMode} found={isFound(state, f.nameClueId)} onFind={find}>
                          {f.realName}
                        </ClueTarget>
                      ) : (
                        <ClueTarget
                          markMode={markMode}
                          found={false}
                          onFind={() => (f.nameClueId ? pushToast(ui.sim.workstation.extensionHint) : find(undefined))}
                        >
                          {f.displayName}
                        </ClueTarget>
                      )}
                    </td>
                    <td>
                      <ClueTarget clueId={f.typeClueId} markMode={markMode} found={isFound(state, f.typeClueId)} onFind={find}>
                        {f.typeLabel}
                      </ClueTarget>
                    </td>
                    <td>{f.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.decisionBar}>
        {done ? <p className={styles.notice}>{ui.sim.workstation.done}</p> : <Button onClick={decide}>{ui.sim.workstation.decide}</Button>}
      </div>
      {markMode && <p className={styles.markHint}>{ui.sim.markModeHint}</p>}
    </SimFrame>
  );
}
