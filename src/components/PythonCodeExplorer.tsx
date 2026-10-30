import React, { useState, useEffect } from 'react';
import {
  FileCode,
  FolderTree,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { PythonFileItem } from '../types';
import { api } from '../services/api';

export const PythonCodeExplorer: React.FC = () => {
  const [files, setFiles] = useState<PythonFileItem[]>([]);
  const [activeFile, setActiveFile] = useState<PythonFileItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getPythonFiles()
      .then((data) => {
        setFiles(data);
        if (data.length > 0) {
          const mainFile = data.find((f) => f.path === 'main.py') || data[0];
          setActiveFile(mainFile);
        }
      })
      .catch((e) => console.error('Failed to load python files:', e))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', activeFile.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Группировка файлов по категориям
  const categories = Array.from(new Set(files.map((f) => f.category)));

  return (
    <div className="flex h-[calc(100vh-65px)] w-full flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Левая панель: Структура каталогов */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Файлы Python бота
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
            {files.length} шт.
          </span>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 block mb-1">
                {cat}
              </span>
              <div className="space-y-0.5">
                {files
                  .filter((f) => f.category === cat)
                  .map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setActiveFile(file)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors font-mono ${
                        activeFile?.path === file.path
                          ? 'bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Запуск бота</span>
            </div>
            <code className="text-[11px] font-mono text-emerald-400 block bg-slate-900 p-1.5 rounded mb-1">
              python main.py
            </code>
            <span className="text-[10px] text-slate-400 block">
              Или через Docker: `docker-compose up -d`
            </span>
          </div>
        </div>
      </div>

      {/* Правая панель: Редактор кода */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
        {activeFile ? (
          <>
            {/* Панель активного файла */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-white">
                  python_bot/{activeFile.path}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {activeFile.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>

                <button
                  onClick={handleDownloadSingle}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Скачать файл</span>
                </button>
              </div>
            </div>

            {/* Просмотр содержимого кода */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
              <pre className="whitespace-pre overflow-x-auto">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            {isLoading ? 'Загрузка файлов...' : 'Выберите файл для просмотра'}
          </div>
        )}
      </div>
    </div>
  );
};
