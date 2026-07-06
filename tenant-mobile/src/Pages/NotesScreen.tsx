import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, FileText, Trash2 } from 'lucide-react-native';
import AppHeader from '../components/ui/AppHeader';

const BLUE = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1C1C1C';
const TEXT_MID = '#6B7280';
const BG = '#FAF8F5';

type Note = { id: string; text: string; date: string };

export default function NotesScreen({ navigation }: any) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addNote = () => {
    if (!text.trim()) return;
    setNotes([
      { id: Date.now().toString(), text, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      ...notes
    ]);
    setText('');
    setIsAdding(false);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      <AppHeader
        title="My Notes"
        subtitle="Keep track of important things"
        showBack={navigation.canGoBack()}
      />

      <ScrollView contentContainerStyle={s.content}>
        {isAdding ? (
          <View style={s.noteInputCard}>
            <TextInput
              style={s.noteInput}
              placeholder="Type your note here..."
              placeholderTextColor={TEXT_MID}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />
            <View style={s.noteActionRow}>
              <TouchableOpacity onPress={() => { setIsAdding(false); setText(''); }}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addNoteBtn} onPress={addNote}>
                <Plus size={16} color={WHITE} />
                <Text style={s.addNoteTxt}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.addNewBtn} onPress={() => setIsAdding(true)}>
            <Plus size={20} color={BLUE} style={{ marginRight: 8 }} />
            <Text style={s.addNewTxt}>Create New Note</Text>
          </TouchableOpacity>
        )}

        {notes.length === 0 && !isAdding ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <FileText size={48} color={BLUE_SOFT} />
            <Text style={{ marginTop: 12, color: TEXT_MID, fontSize: 16 }}>No notes yet.</Text>
          </View>
        ) : (
          notes.map(n => (
            <View key={n.id} style={s.noteCard}>
              <View style={s.noteTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FileText size={14} color={BLUE} style={{ marginRight: 6 }} />
                  <Text style={s.noteDate}>{n.date}</Text>
                </View>
                <TouchableOpacity onPress={() => setNotes(notes.filter(x => x.id !== n.id))}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={s.noteBody}>{n.text}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtnMinimal: { padding: 8, marginLeft: -8 },
  headerTitleCenter: { fontSize: 18, fontWeight: '800', color: WHITE },
  content: { padding: 20 },
  
  addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE_SOFT, borderRadius: 12, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: BLUE, borderStyle: 'dashed' },
  addNewTxt: { color: BLUE, fontSize: 15, fontWeight: '700' },

  noteInputCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: BLUE, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  noteInput: { fontSize: 15, color: TEXT_DARK, minHeight: 80, textAlignVertical: 'top' },
  noteActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '600' },
  addNoteBtn: { backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addNoteTxt: { color: WHITE, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  noteCard: { backgroundColor: BLUE_SOFT, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E7FF' },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteDate: { fontSize: 12, fontWeight: '600', color: BLUE },
  noteBody: { fontSize: 14, color: TEXT_DARK, lineHeight: 20 },
});
