import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { FileText, Image as ImageIcon, CheckCircle, Download, Share2, Trash2, X, FileMinus, AlertTriangle, UploadCloud, File as FileIcon, Eye, Copy, Smartphone, Mail, Cloud, Edit2, MoreHorizontal, WifiOff } from 'lucide-react-native';
import { Theme, PrimaryButton, SecondaryButton, BaseBottomSheet } from './UIComponents';

const { width } = Dimensions.get('window');

// 1. PDF Viewer & Image Viewer (Mock Structural Shells)
export function ViewerShell({ type, title, onBack, onAction }: { type: 'pdf' | 'image', title: string, onBack: () => void, onAction: (action: string) => void }) {
  return (
    <View style={styles.viewerContainer}>
      <View style={styles.viewerHeader}>
        <TouchableOpacity onPress={onBack}><X size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.viewerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => onAction('more')}><MoreHorizontal size={24} color="#FFF" /></TouchableOpacity>
      </View>
      <View style={styles.viewerBody}>
        {type === 'pdf' ? (
          <View style={styles.mockPdf}>
            <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 16 }}>D-HOSTEL</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 32 }}>FEE RECEIPT</Text>
            <View style={{ width: '100%', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 16, marginBottom: 16 }}>
              <Text>Receipt No: RCPT-2456</Text>
              <Text>Student: Rahul Sharma</Text>
              <Text>Amount: ₹ 17,500</Text>
            </View>
            <View style={{ padding: 12, borderWidth: 2, borderColor: Theme.success, borderRadius: 8, transform: [{ rotate: '-15deg' }] }}>
              <Text style={{ color: Theme.success, fontWeight: '800', fontSize: 20 }}>PAID</Text>
            </View>
          </View>
        ) : (
          <View style={styles.mockImg}>
            <ImageIcon size={64} color="#94A3B8" />
            <Text style={{ color: '#94A3B8', marginTop: 12 }}>IMG_20240512.jpg</Text>
          </View>
        )}
      </View>
      <View style={styles.viewerFooter}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => onAction('share')}><Share2 size={24} color="#FFF" /><Text style={styles.footerBtnText}>Share</Text></TouchableOpacity>
        {type === 'image' && <TouchableOpacity style={styles.footerBtn} onPress={() => onAction('edit')}><Edit2 size={24} color="#FFF" /><Text style={styles.footerBtnText}>Edit</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.footerBtn} onPress={() => onAction('download')}><Download size={24} color="#FFF" /><Text style={styles.footerBtnText}>Download</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => onAction('delete')}><Trash2 size={24} color="#FFF" /><Text style={styles.footerBtnText}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// 2. Multi Image Gallery
export function MultiImageGallery() {
  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (i: number) => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  
  return (
    <View style={styles.gallery}>
      <View style={styles.grid}>
        {[1,2,3,4,5,6].map(i => (
          <TouchableOpacity key={i} style={styles.gridItem} onPress={() => toggle(i)} activeOpacity={0.8}>
            <View style={[styles.gridImg, { backgroundColor: ['#E2E8F0', '#CBD5E1', '#94A3B8'][i%3] }]} />
            <View style={[styles.gridCheck, selected.includes(i) && styles.gridCheckActive]}>
              {selected.includes(i) && <CheckCircle size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.galleryFooter}>
        <TouchableOpacity style={styles.footerBtnLight}><CheckCircle size={20} color={Theme.text} /><Text style={styles.footerBtnTextLight}>Select All</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerBtnLight}><Share2 size={20} color={Theme.text} /><Text style={styles.footerBtnTextLight}>Share</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerBtnLight}><Download size={20} color={Theme.text} /><Text style={styles.footerBtnTextLight}>Download</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerBtnLight}><Trash2 size={20} color={Theme.error} /><Text style={[styles.footerBtnTextLight, { color: Theme.error }]}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// 3. Document Preview List
export function DocumentList({ files }: { files: { name: string, type: string, size: string, date: string }[] }) {
  return (
    <View style={{ backgroundColor: '#FFF' }}>
      {files.map((f, i) => (
        <View key={i} style={styles.docRow}>
          <View style={[styles.docIcon, { backgroundColor: f.type === 'PDF' ? '#FEF2F2' : '#F0FDF4' }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: f.type === 'PDF' ? Theme.error : Theme.success }}>{f.type}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.docName} numberOfLines={1}>{f.name}</Text>
            <Text style={styles.docSub}>{f.date} • {f.size}</Text>
          </View>
          <TouchableOpacity><MoreHorizontal size={20} color={Theme.textMuted} /></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// 4. Progress List (Download/Upload)
export function ProgressList({ files, type }: { files: { name: string, ext: string, size: string, total: string, progress: number }[], type: 'upload' | 'download' }) {
  return (
    <View style={{ backgroundColor: '#FFF', padding: 16 }}>
      {files.map((f, i) => (
        <View key={i} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[styles.docIcon, { backgroundColor: f.ext === 'PDF' ? '#FEF2F2' : '#F0FDF4', width: 32, height: 32 }]}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: f.ext === 'PDF' ? Theme.error : Theme.success }}>{f.ext}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.docName} numberOfLines={1}>{f.name}</Text>
              <Text style={styles.docSub}>{f.size} / {f.total}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: f.progress === 100 ? Theme.success : Theme.text }}>
              {f.progress === 100 ? 'Completed' : `${f.progress}%`}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: Theme.border, borderRadius: 2 }}>
            <View style={{ height: '100%', width: `${f.progress}%`, backgroundColor: f.progress === 100 ? Theme.success : (type === 'upload' ? Theme.primary : '#F97316') }} />
          </View>
        </View>
      ))}
      <SecondaryButton label="Cancel All" style={{ marginTop: 8 }} />
    </View>
  );
}

// 5. Share File Sheet
export function ShareFileSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={420}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 24 }}>
        <FileText size={24} color={Theme.error} />
        <View style={{ marginLeft: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700' }}>Fee_Receipt_May_2024.pdf</Text>
          <Text style={{ fontSize: 12, color: Theme.textMuted }}>PDF • 245 KB</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
        {[
          { name: 'WhatsApp', color: '#25D366' },
          { name: 'Gmail', color: '#EA4335' },
          { name: 'Drive', color: '#34A853' },
          { name: 'Bluetooth', color: '#3B82F6' },
        ].map((app, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: app.color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {i === 0 ? <Smartphone size={24} color={app.color} /> : i === 1 ? <Mail size={24} color={app.color} /> : <Cloud size={24} color={app.color} />}
            </View>
            <Text style={{ fontSize: 12, color: Theme.text }}>{app.name}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity style={styles.sheetRow}><Copy size={20} color={Theme.textMuted} /><Text style={styles.sheetRowText}>Copy Link</Text></TouchableOpacity>
      <TouchableOpacity style={styles.sheetRow}><Smartphone size={20} color={Theme.textMuted} /><Text style={styles.sheetRowText}>Nearby Share</Text></TouchableOpacity>
      <TouchableOpacity style={styles.sheetRow}><Download size={20} color={Theme.textMuted} /><Text style={styles.sheetRowText}>Save to Files</Text></TouchableOpacity>
    </BaseBottomSheet>
  );
}

// 6. Upload File Dropzone
export function UploadFileScreen() {
  return (
    <View style={{ padding: 16 }}>
      <View style={{ borderWidth: 2, borderColor: Theme.primary, borderStyle: 'dashed', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24, backgroundColor: Theme.primarySoft }}>
        <UploadCloud size={40} color={Theme.primary} style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: Theme.text }}>Drag & drop your file here</Text>
        <Text style={{ fontSize: 14, color: Theme.textMuted, marginVertical: 8 }}>or</Text>
        <SecondaryButton label="Choose File" style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
      </View>
      <PrimaryButton label="Upload" />
    </View>
  );
}

// 7. File Details
export function FileDetails() {
  return (
    <View style={{ padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: Theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <View style={[styles.docIcon, { backgroundColor: '#FEF2F2', width: 40, height: 40 }]}><Text style={{ color: Theme.error, fontWeight: '800' }}>PDF</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Fee_Receipt_May.pdf</Text>
          <Text style={{ fontSize: 13, color: Theme.textMuted }}>PDF Document • 245 KB</Text>
        </View>
      </View>
      
      <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Details</Text>
      <View style={{ gap: 12, marginBottom: 24 }}>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>File Size</Text><Text style={styles.detailVal}>245 KB</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Uploaded On</Text><Text style={styles.detailVal}>12 May 2024, 10:30 AM</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Uploaded By</Text><Text style={styles.detailVal}>Rahul Sharma</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Category</Text><Text style={styles.detailVal}>Receipts</Text></View>
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Theme.border, paddingTop: 16 }}>
        <TouchableOpacity style={{ alignItems: 'center' }}><Eye size={20} color={Theme.textMuted} /><Text style={{ fontSize: 12, marginTop: 4 }}>View</Text></TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}><Share2 size={20} color={Theme.textMuted} /><Text style={{ fontSize: 12, marginTop: 4 }}>Share</Text></TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}><Download size={20} color={Theme.textMuted} /><Text style={{ fontSize: 12, marginTop: 4 }}>Download</Text></TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}><Trash2 size={20} color={Theme.error} /><Text style={{ fontSize: 12, marginTop: 4, color: Theme.error }}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// 8. Error States
export function FileErrorState({ type }: { type: 'offline' | 'not_found' | 'unsupported' }) {
  const getProps = () => {
    if (type === 'offline') return { icon: WifiOff, color: '#F97316', title: 'You\'re Offline', desc: 'This file is not available offline.\nPlease connect to the internet to view it.', btn: 'Retry', sec: 'Open Other Files' };
    if (type === 'not_found') return { icon: FileMinus, color: Theme.error, title: 'File Not Found', desc: 'The file you\'re looking for doesn\'t exist or has been removed.', btn: 'Go Back', sec: 'Browse Documents' };
    return { icon: AlertTriangle, color: Theme.warning, title: 'Unsupported File', desc: 'This file type is not supported by the app.', btn: 'Download & Open Externally', sec: 'Go Back' };
  };
  const p = getProps();
  const Icon = p.icon;
  return (
    <View style={styles.errorBox}>
      <View style={[styles.iconBox, { backgroundColor: p.color + '15' }]}><Icon size={40} color={p.color} /></View>
      <Text style={styles.title}>{p.title}</Text>
      <Text style={styles.desc}>{p.desc}</Text>
      <PrimaryButton label={p.btn} style={{ width: '100%', marginBottom: 12, backgroundColor: p.color }} />
      <SecondaryButton label={p.sec} style={{ width: '100%', borderColor: p.color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  viewerContainer: { width: '100%', height: 400, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  viewerTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mockPdf: { width: '80%', height: '90%', backgroundColor: '#FFF', borderRadius: 8, padding: 24, alignItems: 'center' },
  mockImg: { alignItems: 'center' },
  viewerFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  footerBtn: { alignItems: 'center' },
  footerBtnText: { color: '#FFF', fontSize: 11, marginTop: 4 },
  
  gallery: { backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  gridItem: { width: '33.33%', aspectRatio: 1, padding: 4 },
  gridImg: { flex: 1, borderRadius: 8 },
  gridCheck: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  gridCheckActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  galleryFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Theme.border },
  footerBtnLight: { alignItems: 'center' },
  footerBtnTextLight: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.border },
  docIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 15, fontWeight: '600', color: Theme.text },
  docSub: { fontSize: 13, color: Theme.textMuted, marginTop: 2 },
  
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetRowText: { fontSize: 15, fontWeight: '600', color: Theme.text, marginLeft: 16 },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: Theme.textMuted },
  detailVal: { fontSize: 14, fontWeight: '600', color: Theme.text },
  
  errorBox: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: Theme.border, padding: 24, alignItems: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: Theme.text, marginBottom: 8 },
  desc: { fontSize: 14, color: Theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
