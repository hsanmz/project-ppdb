import { readFileSync, writeFileSync } from 'fs';
const path = 'app/admin/dashboard/CrudFormDialog.tsx';
let s = readFileSync(path, 'utf8');
const old = `              <div className="min-w-0">
                <FormSection label="Isi Berita" icon={FileText} hint="Editor teks kaya">
                  <RichTextEditor
                    id={contentFieldId('content')}
                    value={String(formData['_c_content'] ?? '')}
                    onChange={(html) => setFormData({ ...formData, _c_content: html })}
                    placeholder="Tulis isi berita di sini\u00ef\u00bf\u00bd\u00ef\u00bf\u00bd"
                  />
                </FormSection>
              </div>`;
const neu = `              <div className="flex min-h-0 flex-col overflow-hidden">
                <FormSection label="Isi Berita" icon={FileText} hint="Editor teks kaya" className="flex min-h-0 flex-1 flex-col overflow-hidden [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col [&>div]:overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <RichTextEditor
                      id={contentFieldId('content')}
                      value={String(formData['_c_content'] ?? '')}
                      onChange={(html) => setFormData({ ...formData, _c_content: html })}
                      placeholder="Tulis isi berita di sini\u2026"
                    />
                  </div>
                </FormSection>
              </div>`;
if (s.includes(old)) {
  writeFileSync(path, s.replace(old, neu));
  console.log('ok');
} else {
  console.log('no');
}
