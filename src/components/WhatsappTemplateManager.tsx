import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit, Trash2, MessageSquare, Save, RotateCcw } from 'lucide-react';
import { WhatsappTemplate, DEFAULT_WHATSAPP_TEMPLATES } from '../utils/whatsappTemplates';

interface Props {
  templates: WhatsappTemplate[];
  onChange: (list: WhatsappTemplate[]) => void;
  onClose: () => void;
}

const BLANK: WhatsappTemplate = { id: '', title: '', en: '', es: '', it: '' };

export default function WhatsappTemplateManager({ templates, onChange, onClose }: Props) {
  const [editing, setEditing] = useState<WhatsappTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'es' | 'it'>('en');

  const startNew = () => {
    setEditing({ ...BLANK, id: `tpl-${Date.now()}` });
    setIsNew(true);
    setLang('en');
  };

  const startEdit = (tpl: WhatsappTemplate) => {
    setEditing({ ...tpl });
    setIsNew(false);
    setLang('en');
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      alert('Please give the template a title.');
      return;
    }
    if (isNew) {
      onChange([...templates, editing]);
    } else {
      onChange(templates.map(t => (t.id === editing.id ? editing : t)));
    }
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    onChange(templates.filter(t => t.id !== id));
    setDeleteId(null);
  };

  const resetDefaults = () => {
    if (confirm('Reset all templates back to the built-in defaults? Your custom changes will be lost.')) {
      onChange(DEFAULT_WHATSAPP_TEMPLATES);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 font-sans truncate">WhatsApp Message Templates</h3>
                <p className="text-slate-450 text-xs font-semibold text-slate-500">Create, edit and manage reusable messages.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto">
            {!editing ? (
              <>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{templates.length} template(s)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={resetDefaults}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
                    </button>
                    <button
                      onClick={startNew}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/15 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Template
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {templates.length === 0 && (
                    <p className="text-center text-xs text-slate-400 font-semibold py-8">No templates yet. Create your first one.</p>
                  )}
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white/60 hover:bg-slate-50 transition">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{tpl.title || '(untitled)'}</h4>
                        <p className="text-[0.6875rem] text-slate-500 font-medium truncate mt-0.5">{tpl.en.slice(0, 80)}…</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => startEdit(tpl)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition cursor-pointer"
                          title="Edit template"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(tpl.id)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Editor */
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">Template Title</label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="e.g. 6 - Late Arrival Notice"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="flex gap-2">
                  {(['en', 'es', 'it'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        lang === l ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {l === 'en' ? '🇬🇧 English' : l === 'es' ? '🇪🇸 Español' : '🇮🇹 Italiano'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">
                    Message Body ({lang.toUpperCase()})
                  </label>
                  <textarea
                    value={editing[lang]}
                    onChange={(e) => setEditing({ ...editing, [lang]: e.target.value })}
                    rows={9}
                    placeholder="Type the message. Use placeholders like {leadTraveler}, {tourName}, {bookingRef}, {travelDate}, {tourTime}."
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none leading-relaxed focus:border-orange-500 focus:bg-white"
                  />
                  <p className="text-[0.625rem] text-slate-400 font-medium">
                    Placeholders: <code className="text-slate-600">{'{leadTraveler} {tourName} {bookingRef} {travelDate} {tourTime} {meetingPoint}'}</code>
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => { setEditing(null); setIsNew(false); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" /> {isNew ? 'Create Template' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {deleteId && (
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
              onClick={(e) => { e.stopPropagation(); setDeleteId(null); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xl max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Template</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  This message template will be permanently removed. This cannot be undone.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteId)}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>,
    document.body
  );
}
