import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { financeService } from '../services/financeService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiChatAssistantModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AiChatAssistantModal: React.FC<AiChatAssistantModalProps> = ({
  visible,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là Trợ lý AI Tài chính WIVI. Bạn có thể hỏi tôi về cách phân bổ hũ, lập kế hoạch chi tiêu, hoặc kiểm tra sức khỏe tài chính của bạn.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const suggestedPrompts = [
    '💡 Phân tích hũ chi tiêu hiện tại',
    '📊 Dự báo ngân sách cuối tháng',
    '💰 Mẹo tiết kiệm 20% thu nhập',
    '❓ Có nên mua trả góp không?',
  ];

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [visible, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const recentHistory = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await financeService.chatWithAi(text, recentHistory);
      const aiReply =
        res.advice ||
        res.reply ||
        res.message ||
        'Tôi đã ghi nhận thông tin và đang tối ưu hóa các gợi ý tài chính cho bạn!';

      const botMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          'Xin lỗi, không thể kết nối tới máy chủ AI lúc này. Hãy kiểm tra kết nối mạng hoặc thử lại sau!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.botInfo}>
              <View style={styles.avatarGlow}>
                <MaterialCommunityIcons name="robot-outline" size={24} color="#6C5CE7" />
              </View>
              <View>
                <View style={styles.row}>
                  <Text style={styles.headerTitle}>WIVI AI Advisor</Text>
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineText}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>Tư vấn tài chính thông minh 24/7</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          {/* Quick suggestions */}
          <View style={styles.quickPromptsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsList}>
              {suggestedPrompts.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptChip}
                  onPress={() => handleSendMessage(p)}
                >
                  <Text style={styles.promptChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((item) => {
              const isUser = item.role === 'user';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userMessageRow : styles.botMessageRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.botIconMini}>
                      <MaterialCommunityIcons name="star-four-points" size={14} color="#6C5CE7" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.timestamp,
                        isUser ? styles.userTimestamp : styles.botTimestamp,
                      ]}
                    >
                      {item.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.botMessageRow]}>
                <View style={styles.botIconMini}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color="#6C5CE7" />
                </View>
                <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#6C5CE7" />
                  <Text style={styles.typingText}>AI đang phân tích dữ liệu...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Nhập câu hỏi tài chính của bạn..."
              placeholderTextColor="#718096"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13151B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    borderWidth: 1,
    borderColor: '#262933',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222530',
    backgroundColor: '#181A22',
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#201D38',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  onlineText: {
    color: '#A29BFE',
    fontSize: 10,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#8A92A6',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#222530',
  },
  quickPromptsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E212B',
    backgroundColor: '#161820',
  },
  quickPromptsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#222634',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2F3447',
  },
  promptChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#13151B',
  },
  messagesList: {
    padding: 16,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  botMessageRow: {
    justifyContent: 'flex-start',
  },
  botIconMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#201D38',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#1E2230',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2D3245',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  botText: {
    color: '#E2E8F0',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#64748B',
    textAlign: 'left',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#181A22',
    borderTopWidth: 1,
    borderTopColor: '#222530',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#222634',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2F3447',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#2F3447',
    opacity: 0.6,
  },
});
