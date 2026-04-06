import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet,
  Alert, Switch, ScrollView, StatusBar, Vibration
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const FloatingButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.floatingBtn}>
    <LinearGradient colors={['#6C63FF', '#3F3D9E']} style={styles.floatingBtnGradient}>
      <Text style={styles.floatingBtnText}>+</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const TaskItem = ({ task, onToggle, onDelete, onEdit }) => {
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteBox} onPress={() => onDelete(task.id)}>
      <Text style={styles.deleteText}>🗑️</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.taskCard}>
        <TouchableOpacity onPress={() => onToggle(task.id)} style={styles.checkbox}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskTextContainer}>
          <Text style={[styles.taskTitle, task.completed && styles.completedText]}>{task.title}</Text>
          {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
          {task.dueDate && <Text style={styles.taskDate}>📅 {formatTime(task.dueDate)}</Text>}
        </View>
        <TouchableOpacity onPress={() => onEdit(task)} style={styles.editBtn}>
          <Text>✏️</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

export default function App() {
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyMode, setDailyMode] = useState(false);

  useEffect(() => {
    loadTasks();
    Notifications.requestPermissionsAsync();
  }, []);

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('tasks');
      if (stored) setTasks(JSON.parse(stored));
    } catch (e) {}
  };

  const saveTasks = async (newTasks) => {
    setTasks(newTasks);
    await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  const addOrUpdateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Task title required');
      return;
    }
    let newTasks = [...tasks];
    if (editingTask) {
      const index = newTasks.findIndex(t => t.id === editingTask.id);
      newTasks[index] = { ...editingTask, title: title.trim(), description: description.trim(), dueDate: dueDate.toISOString() };
    } else {
      newTasks.push({
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        completed: false,
        dueDate: dueDate.toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    await saveTasks(newTasks);
    closeModal();
  };

  const toggleComplete = async (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    await saveTasks(updated);
  };

  const deleteTask = async (id) => {
    const filtered = tasks.filter(t => t.id !== id);
    await saveTasks(filtered);
  };

  const openModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(new Date(task.dueDate || Date.now()));
    } else {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setDueDate(new Date());
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTask(null);
    setTitle('');
    setDescription('');
  };

  const getFilteredTasks = () => {
    if (dailyMode) {
      const today = new Date().toDateString();
      return tasks.filter(t => new Date(t.createdAt || t.dueDate).toDateString() === today);
    }
    return tasks;
  };

  if (locked) {
    return (
      <LinearGradient colors={['#1F1C2C', '#2A1E3C']} style={styles.lockContainer}>
        <Text style={styles.lockTitle}>🔒 Enter PIN</Text>
        <TextInput style={styles.pinInput} secureTextEntry keyboardType="number-pad" value={pin} onChangeText={setPin} maxLength={4} />
        <TouchableOpacity style={styles.unlockBtn} onPress={() => {
          if (pin === '1234') setLocked(false);
          else { Vibration.vibrate(100); Alert.alert('Wrong PIN'); setPin(''); }
        }}>
          <Text style={styles.unlockText}>Unlock</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LinearGradient colors={['#F5F7FA', '#E9EEF5']} style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📝 TaskMaster Pro</Text>
            <TouchableOpacity onPress={() => setDailyMode(!dailyMode)} style={styles.modeBtn}>
              <Text style={styles.modeText}>{dailyMode ? '📅 All' : '🌞 Daily'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>📋 Total: {tasks.length}</Text>
            <Text style={styles.statsText}>✅ Done: {tasks.filter(t => t.completed).length}</Text>
          </View>
          <FlatList
            data={getFilteredTasks()}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TaskItem task={item} onToggle={toggleComplete} onDelete={deleteTask} onEdit={openModal} />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={<Text style={styles.emptyText}>✨ No tasks. Tap + to add.</Text>}
          />
          <FloatingButton onPress={() => openModal()} />
          
          <Modal visible={modalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingTask ? '✏️ Edit Task' : '➕ New Task'}</Text>
                <TextInput style={styles.input} placeholder="Task title *" value={title} onChangeText={setTitle} />
                <TextInput style={[styles.input, styles.textArea]} placeholder="Description (optional)" multiline value={description} onChangeText={setDescription} />
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                  <Text style={styles.dateBtnText}>📅 Due: {dueDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker 
                    value={dueDate} 
                    mode="datetime" 
                    display="default" 
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setDueDate(selectedDate);
                    }} 
                  />
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={addOrUpdateTask}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Constants.statusBarHeight + 10 },
  lockContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockTitle: { fontSize: 28, color: 'white', marginBottom: 30, fontWeight: 'bold' },
  pinInput: { backgroundColor: 'white', width: 150, textAlign: 'center', fontSize: 24, borderRadius: 12, padding: 10, marginBottom: 20 },
  unlockBtn: { backgroundColor: '#6C63FF', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 30 },
  unlockText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
  modeBtn: { backgroundColor: '#6C63FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modeText: { color: 'white', fontWeight: '600' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  statsText: { fontSize: 14, color: '#555', fontWeight: '500' },
  taskCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginHorizontal: 16, marginVertical: 6, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkmark: { fontSize: 18, color: '#6C63FF', fontWeight: 'bold' },
  taskTextContainer: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#1E2A3A' },
  completedText: { textDecorationLine: 'line-through', color: '#aaa' },
  taskDesc: { fontSize: 13, color: '#777', marginTop: 2 },
  taskDate: { fontSize: 11, color: '#999', marginTop: 4 },
  editBtn: { padding: 8, marginLeft: 5 },
  deleteBox: { backgroundColor: '#FF5E5E', justifyContent: 'center', alignItems: 'center', width: 70, borderRadius: 12, marginVertical: 6, marginRight: 16 },
  deleteText: { fontSize: 24, color: 'white' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#aaa' },
  floatingBtn: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowRadius: 8, shadowOpacity: 0.3, elevation: 8 },
  floatingBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingBtnText: { fontSize: 32, color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '90%', borderRadius: 28, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dateBtn: { backgroundColor: '#F0F0F0', padding: 12, borderRadius: 12, marginBottom: 12 },
  dateBtnText: { fontSize: 16, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#E0E0E0', padding: 12, borderRadius: 12, marginRight: 10, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#6C63FF', padding: 12, borderRadius: 12, marginLeft: 10, alignItems: 'center' },
  saveText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
