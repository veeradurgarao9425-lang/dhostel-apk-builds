import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { ChevronLeft, Search, X, Clock, ArrowRight, Filter } from 'lucide-react-native';
import { Phase3EmptyState } from '../components/UIComponents';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(['Mess Charges', 'Room 201', 'Electricity Bill', 'Maintenance', 'Water Bill']);
  
  const allResults = [
    { id: '1', title: 'Mess Charges - May 2026', date: '14 May 2026', amount: '₹ 3,650', status: 'Unpaid', statusColor: '#EF4444' },
    { id: '2', title: 'Mess Charges - April 2026', date: '14 Apr 2026', amount: '₹ 3,650', status: 'Paid', statusColor: '#22C55E' },
    { id: '3', title: 'Mess Charges - March 2026', date: '14 Mar 2026', amount: '₹ 3,500', status: 'Paid', statusColor: '#22C55E' },
    { id: '4', title: 'Mess Advance', date: '01 May 2026', amount: '₹ 2,000', status: 'Paid', statusColor: '#22C55E' },
    { id: '5', title: 'Mess Charges - Feb 2026', date: '14 Feb 2026', amount: '₹ 3,500', status: 'Overdue', statusColor: '#EF4444' },
  ];

  const filteredResults = query.length > 2 
    ? allResults.filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  const renderContent = () => {
    // 1. DEFAULT STATE / NO TYPING
    if (query.length === 0) {
      return (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={sStyles.rowBetween}>
            <Text style={sStyles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={() => setRecent([])}><Text style={sStyles.clearAll}>Clear All</Text></TouchableOpacity>
          </View>
          <View style={{ marginBottom: 32 }}>
            {recent.map(r => (
              <TouchableOpacity key={r} style={sStyles.recentItem} onPress={() => setQuery(r)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Clock size={16} color="#94A3B8" />
                  <Text style={sStyles.recentText}>{r}</Text>
                </View>
                <ArrowRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={sStyles.sectionTitle}>Popular Searches</Text>
          <View style={sStyles.chipGrid}>
            {['Dues', 'Expenses', 'Complaints', 'Notices', 'Rooms', 'Profile'].map(p => (
              <TouchableOpacity key={p} style={sStyles.chip} onPress={() => setQuery(p)}>
                <Text style={sStyles.chipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }

    // 2. SUGGESTIONS (Typing but not matching mock results perfectly, so we show suggestions)
    if (query.length > 0 && query.length <= 2) {
      return (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={sStyles.sectionTitle}>Suggestions</Text>
          {['Mess Charges', 'Mess Advance', 'Mess Menu', 'Mess Bill', 'Mess Timings'].map(s => (
            <TouchableOpacity key={s} style={sStyles.recentItem} onPress={() => setQuery(s)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Search size={16} color="#94A3B8" />
                <Text style={sStyles.recentText}>{s}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    // 3. NO RESULTS FOUND
    if (filteredResults.length === 0) {
      return (
        <View style={{ flex: 1, marginTop: 40 }}>
          <Phase3EmptyState 
            variant="search" 
            onAction={() => {}} 
            onSecondaryAction={() => setQuery('')} 
          />
        </View>
      );
    }

    // 4. SHOWING MATCHING RESULTS
    return (
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={[sStyles.rowBetween, { marginBottom: 16 }]}>
          <Text style={sStyles.resultsCount}>Results ({filteredResults.length})</Text>
          <TouchableOpacity style={sStyles.filterBtn}>
            <Filter size={16} color="#475569" />
            <Text style={sStyles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {filteredResults.map(res => (
          <View key={res.id} style={sStyles.resultCard}>
            <View style={sStyles.cardIcon}>
              <View style={{ width: 40, height: 40, backgroundColor: '#FFF7ED', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Text>📄</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sStyles.cardTitle}>{res.title}</Text>
              <Text style={sStyles.cardDate}>{res.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={sStyles.cardAmount}>{res.amount}</Text>
              <Text style={[sStyles.cardStatus, { color: res.statusColor }]}>{res.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={sStyles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Search Header */}
      <View style={sStyles.header}>
        <TouchableOpacity style={sStyles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={sStyles.searchBar}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={sStyles.input}
            placeholder="Search anything..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dynamic Content */}
      {renderContent()}

    </SafeAreaView>
  );
}

const sStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { marginRight: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  clearAll: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  recentText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', width: '30%', alignItems: 'center' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  resultsCount: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  resultCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardIcon: { marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDate: { fontSize: 13, color: '#64748B' },
  cardAmount: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardStatus: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
});
