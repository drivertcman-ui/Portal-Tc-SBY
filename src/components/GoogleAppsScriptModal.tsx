import React, { useState, useEffect } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWebhookUrl: string;
  onSaveWebhook: (url: string) => Promise<void>;
}

const DEFAULT_PERMANENT_URL = 'https://script.google.com/macros/s/AKfycbzTYfIFIPwO4iSFE_-TYOcE4jqx7XA_M-WBh59qy8MOsLqNLKFPIf-N10ijaErDYGqE4A/exec';

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  currentWebhookUrl,
  onSaveWebhook,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || DEFAULT_PERMANENT_URL);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setWebhookUrl(currentWebhookUrl || DEFAULT_PERMANENT_URL);
  }, [currentWebhookUrl]);

  if (!isOpen) return null;

  const appsScriptCode = `/**
 * Google Apps Script untuk Portal TC Surabaya
 * Mendukung Sinkronisasi AkunPintar & Absensi Kehadiran Training
 * Spreadsheet ID: 1VyP2x_0zRX8iqa8XadKyURKH5Yz55WFJVECaeQUpP0g
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data || payload;
    
    // 1. UPDATE / EDIT / CLEAR AKUN PINTAR
    if (action === "update_akun_pintar" && data && data.nik) {
      var sheet = ss.getSheetByName("AkunPintar");
      if (!sheet) {
        sheet = ss.insertSheet("AkunPintar");
        sheet.appendRow(["nik", "nama", "Jabatan", "wa", "email_pintar", "password_pintar"]);
      }
      
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var foundRow = -1;
      
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === String(data.nik).trim()) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow > 0) {
        sheet.getRange(foundRow, 4).setValue(data.wa || "");
        sheet.getRange(foundRow, 5).setValue(data.email_pintar || "");
        sheet.getRange(foundRow, 6).setValue(data.password_pintar || "");
      } else {
        sheet.appendRow([data.nik, data.nama || "", data.jabatan || "", data.wa || "", data.email_pintar || "", data.password_pintar || ""]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "update_akun_pintar", nik: data.nik }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SUBMIT ABSENSI KEHADIRAN TRAINING
    if (action === "submit_absensi" && data && data.nik) {
      var sheetAbsensi = ss.getSheetByName("Absensi");
      if (!sheetAbsensi) {
        sheetAbsensi = ss.insertSheet("Absensi");
        sheetAbsensi.appendRow(["TANGGAL", "NIK", "NAMA", "KODE TOKO", "NAMA TOKO", "JENIS TRAINING", "STATUS", "WAKTU ABSEN"]);
      }
      
      sheetAbsensi.appendRow([
        data.tanggal || "",
        data.nik || "",
        data.nama || "",
        data.kode_toko || "",
        data.nama_toko || "",
        data.jenis_training || "",
        data.status || "HADIR",
        data.waktu_absen || new Date().toLocaleString("id-ID")
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "submit_absensi", nik: data.nik }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveWebhook(webhookUrl);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Otomasi 2-Way Sync Google Apps Script
              </h3>
              <p className="text-xs text-slate-400">
                Data Akun Pintar dan Absensi Kehadiran Training otomatis terkirim langsung ke Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-2">
            <div className="font-semibold text-white">Status Webhook Terpasang:</div>
            <div className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 p-2 rounded border border-emerald-800/50 break-all">
              ✓ {DEFAULT_PERMANENT_URL}
            </div>
            <p className="text-slate-300 text-[11px]">
              Setiap kali karyawan menginput Akun Pintar atau melakukan Absensi Kehadiran Training, sistem langsung memicu Webhook di atas untuk memperbarui data pada Google Spreadsheet secara permanen.
            </p>
          </div>

          {/* Code Viewer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Kode Apps Script (Code.gs)</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 px-2.5 py-1 rounded"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-44 leading-relaxed">
              {appsScriptCode}
            </pre>
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-slate-200">
              URL Web App Apps Script Aktif
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan URL'}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-[11px] text-emerald-400">✓ URL Webhook berhasil disimpan!</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
