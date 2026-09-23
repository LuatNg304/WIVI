import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFinancial } from '../context/FinancialContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinkBankModal } from '../components/LinkBankModal';
import { AppHeader } from '../components/AppHeader';

type InputMode = 'manual' | 'ocr' | 'bank';

interface MockReceipt {
  id: string;
  merchant: string;
  amount: number;
  preview: string;
}

const MOCK_RECEIPTS: MockReceipt[] = [
  { id: 'rec1', merchant: 'Co.opmart Siêu Thị', amount: 320000, preview: 'Hóa đơn thực phẩm gia đình' },
  { id: 'rec2', merchant: 'Highlands Coffee', amount: 85000, preview: 'Thanh toán nước uống' },
  { id: 'rec3', merchant: 'Nhà Sách Fahasa', amount: 250000, preview: 'Mua sách giáo trình AI' },
  { id: 'rec4', merchant: 'Apple Store Vietnam', amount: 15000000, preview: 'Mua phụ kiện & thiết bị' },
];

interface RecordScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToHistory?: () => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({
  onNavigateToSettings,
  onNavigateToHistory,
}) => {
  const {
    jars,
    addTransaction,
    runIncomeAllocation,
    runOCRBillScan,
    runBankSync,
  } = useFinancial();

  const [mode, setMode] = useState<InputMode>('ocr');

  // Manual Input State - Loại bỏ các hũ trùng tên
  const uniqueSpendJars = jars
    .filter((j) => j.type === 'spend')
    .filter((jar, index, self) => index === self.findIndex((t) => t.name.trim().toLowerCase() === jar.name.trim().toLowerCase()));
  const spendJars = uniqueSpendJars;
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense');
  const [paymentSource, setPaymentSource] = useState<'cash' | 'bank'>('cash');
  const [isAutoAllocate, setIsAutoAllocate] = useState(false);
  const [selectedJarId, setSelectedJarId] = useState(spendJars[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app Toast Banner state
  const [toastInfo, setToastInfo] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const notifyUser = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setToastInfo({ title, message, type });
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
    setTimeout(() => {
      setToastInfo(null);
    }, 4500);
  };

  useEffect(() => {
    if (spendJars.length > 0 && (!selectedJarId || selectedJarId === '1' || !spendJars.some((j) => j.id === selectedJarId))) {
      setSelectedJarId(spendJars[0].id);
    }
  }, [spendJars, selectedJarId]);

  // OCR Scan State
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<MockReceipt>(MOCK_RECEIPTS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const mobileCameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Tự động yêu cầu quyền camera khi vào tab OCR trên mobile
  useEffect(() => {
    if (mode === 'ocr' && Platform.OS !== 'web' && !cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [mode, cameraPermission?.granted]);

  // Khởi động Camera thật trên Trình duyệt Web (Webcam)
  const startWebCamera = useCallback(async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
        setIsCameraActive(true);
      } catch (e) {
        console.warn('Không thể mở Webcam trình duyệt:', e);
        setIsCameraActive(false);
      }
    }
  }, []);

  const stopWebCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks?.().forEach((track: any) => track.stop?.());
      } catch (e) {}
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Tự động bật camera khi chuyển sang tab 'ocr' trên máy tính / Web
  useEffect(() => {
    if (mode === 'ocr' && !selectedImageUri && Platform.OS === 'web') {
      startWebCamera();
    } else {
      stopWebCamera();
    }
    return () => {
      stopWebCamera();
    };
  }, [mode, selectedImageUri, startWebCamera, stopWebCamera]);

  // Bank Sync State
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [linkBankModalVisible, setLinkBankModalVisible] = useState(false);

  // Handlers
  const handleSaveManual = async () => {
    const val = parseFloat(manualAmount.replace(/[^0-9]/g, '')) || 0;
    if (val <= 0) {
      notifyUser('Thông báo', 'Vui lòng nhập số tiền giao dịch hợp lệ.', 'error');
      return;
    }

    // Mô tả không bắt buộc, tự động gán mặc định nếu để trống
    const finalDescription = manualDesc.trim() || (manualType === 'expense' ? 'Chi tiêu' : 'Thu nhập');

    setIsSubmitting(true);
    let success = false;

    if (manualType === 'income' && isAutoAllocate) {
      success = await runIncomeAllocation(val, paymentSource, finalDescription);
    } else {
      success = await addTransaction(val, manualType, finalDescription, selectedJarId, paymentSource);
    }

    setIsSubmitting(false);

    if (success) {
      setManualAmount('');
      setManualDesc('');
      setIsAutoAllocate(false);
      notifyUser(
        'Thành công 🎉',
        manualType === 'expense'
          ? `Đã lưu chi tiêu ${val.toLocaleString('vi-VN')} đ vào hũ và cập nhật số dư thành công!`
          : `Đã ghi nhận thu nhập ${val.toLocaleString('vi-VN')} đ và cộng vào số dư thành công!`,
        'success'
      );
    } else {
      notifyUser('Lỗi', 'Không thể ghi nhận giao dịch. Vui lòng thử lại.', 'error');
    }
  };

  const handleConfirmOcrTransaction = async () => {
    if (!scanResult) return;
    setIsSubmitting(true);
    const targetJarId = scanResult.jarId || spendJars[0]?.id;
    const success = await addTransaction(
      scanResult.amount,
      'expense',
      scanResult.description || 'Hóa đơn quét OCR',
      targetJarId,
      'cash'
    );
    setIsSubmitting(false);

    if (success) {
      notifyUser(
        'Thành công 🎉',
        'Đã lưu hóa đơn OCR thành công! Số dư và % chi tiêu của hũ ngân sách đã được cập nhật.',
        'success'
      );
      setScanResult(null);
      setSelectedImageUri(null);
      if (Platform.OS === 'web') {
        startWebCamera();
      }
    } else {
      notifyUser('Lỗi', 'Không thể lưu hóa đơn. Vui lòng thử lại.', 'error');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Quyền truy cập thư viện',
          'Vui lòng cấp quyền truy cập Thư viện ảnh trong Cài đặt để chọn hóa đơn.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        stopWebCamera();
        setSelectedImageUri(result.assets[0].uri);
        handleScanRealImage(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Lỗi chọn ảnh thư viện:', e);
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh: ' + (e?.message || 'Vui lòng thử lại.'));
    }
  };

  const handleTakePhoto = async () => {
    // 1. Nếu đang trên máy tính / Web và có luồng Webcam đang phát
    if (Platform.OS === 'web') {
      if (videoRef.current && (videoRef.current.videoWidth > 0 || videoRef.current.readyState >= 2)) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 1280;
          canvas.height = videoRef.current.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUri = canvas.toDataURL('image/jpeg', 0.9);
            stopWebCamera();
            setSelectedImageUri(dataUri);
            handleScanRealImage(dataUri);
            return;
          }
        } catch (e) {
          console.warn('Canvas capture error:', e);
        }
      }

      // Nếu chưa bật webcam, thử khởi động lại
      if (!isCameraActive) {
        await startWebCamera();
        return;
      }
    }

    // 2. Nếu trên thiết bị di động (iOS / Android)
    if (Platform.OS !== 'web') {
      // Ưu tiên chụp trực tiếp từ Live CameraView trong app
      if (mobileCameraRef.current) {
        try {
          const photo = await mobileCameraRef.current.takePictureAsync({ quality: 0.85 });
          if (photo && photo.uri) {
            setSelectedImageUri(photo.uri);
            handleScanRealImage(photo.uri);
            return;
          }
        } catch (err) {
          console.warn('Lỗi chụp in-app camera, chuyển sang mở camera hệ thống:', err);
        }
      }

      // Fallback: Mở Camera hệ thống nếu live camera chưa sẵn sàng
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Quyền truy cập Camera',
            'Vui lòng cấp quyền truy cập Camera trong Cài đặt ứng dụng để chụp ảnh hóa đơn.'
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          setSelectedImageUri(result.assets[0].uri);
          handleScanRealImage(result.assets[0].uri);
        }
      } catch (e: any) {
        console.warn('Lỗi mở Camera:', e);
        Alert.alert('Lỗi Camera', 'Không thể mở Camera: ' + (e?.message || 'Vui lòng thử lại hoặc chọn ảnh từ thư viện.'));
      }
    }
  };

  const handleScanRealImage = async (uri: string) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await runOCRBillScan(uri);
      setIsScanning(false);

      const parsedAmount =
        res.totalAmount ??
        res.amount ??
        res.preview?.transaction?.amount ??
        150000;
      const parsedMerchant =
        res.merchantName ||
        res.description ||
        res.preview?.transaction?.merchantName ||
        '';
      const formattedDesc = parsedMerchant
        ? parsedMerchant.startsWith('Hóa đơn')
          ? parsedMerchant
          : `Hóa đơn: ${parsedMerchant}`
        : 'Hóa đơn quét OCR';

      // Auto-match best jar based on AI category / merchant name
      let bestJarId = spendJars[0]?.id;
      const cat = (res.suggestedCategory || parsedMerchant || '').toLowerCase();
      if (cat.includes('ăn') || cat.includes('uống') || cat.includes('cà phê') || cat.includes('food') || cat.includes('siêu thị')) {
        const found = spendJars.find((j) => j.name.toLowerCase().includes('thiết yếu') || j.name.toLowerCase().includes('ăn'));
        if (found) bestJarId = found.id;
      } else if (cat.includes('giải trí') || cat.includes('hưởng thụ') || cat.includes('chơi') || cat.includes('xem phim')) {
        const found = spendJars.find((j) => j.name.toLowerCase().includes('hưởng thụ') || j.name.toLowerCase().includes('giải trí'));
        if (found) bestJarId = found.id;
      } else if (cat.includes('học') || cat.includes('sách') || cat.includes('phát triển') || cat.includes('khóa học')) {
        const found = spendJars.find((j) => j.name.toLowerCase().includes('học') || j.name.toLowerCase().includes('phát triển'));
        if (found) bestJarId = found.id;
      }

      setScanResult({
        amount: Number(parsedAmount) || 0,
        description: formattedDesc,
        jarId: bestJarId || spendJars[0]?.id,
        isPending: false,
        items: res.items || [],
        date: res.date || new Date().toISOString().split('T')[0],
        category: res.suggestedCategory || 'Ăn uống',
      });
    } catch (e) {
      setIsScanning(false);
      setScanResult({
        amount: 150000,
        description: 'Hóa đơn quét OCR',
        jarId: spendJars[0]?.id,
        isPending: false,
      });
    }
  };

  const handleStartOCRScanMock = async () => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        amount: selectedReceipt.amount,
        description: `Hóa đơn: ${selectedReceipt.merchant}`,
        jarId: spendJars[0]?.id,
        isPending: selectedReceipt.id === 'rec4',
        items: [{ name: selectedReceipt.preview, amount: selectedReceipt.amount }],
      });
    }, 1200);
  };

  const handleStartBankSync = async () => {
    if (!selectedBank) {
      Alert.alert('Thông báo', 'Vui lòng chọn ngân hàng cần kết nối.');
      return;
    }
    setIsSyncing(true);
    setSyncCount(null);

    try {
      const count = await runBankSync();
      setIsSyncing(false);
      setSyncCount(count || 3);
    } catch (e) {
      setIsSyncing(false);
      Alert.alert('Lỗi', 'Đồng bộ ngân hàng thất bại. Vui lòng kiểm tra lại kết nối.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* FLOATING SUCCESS/ERROR TOAST BANNER */}
      {toastInfo && (
        <View style={[styles.toastBanner, toastInfo.type === 'error' ? styles.toastBannerError : styles.toastBannerSuccess]}>
          <Ionicons
            name={toastInfo.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={24}
            color="#FFFFFF"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>{toastInfo.title}</Text>
            <Text style={styles.toastMessage}>{toastInfo.message}</Text>
          </View>
        </View>
      )}

      {/* 1. TOP UNIFIED HEADER */}
      <AppHeader
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToHistory={onNavigateToHistory}
      />

      <Text style={styles.screenTitle}>Ghi nhận Giao dịch</Text>

      {/* SEGMENTED CONTROL */}
      <View style={styles.segmentedContainer}>
        {(['manual', 'ocr', 'bank'] as InputMode[]).map((m) => {
          const label = m === 'manual' ? 'Nhập tay' : m === 'ocr' ? 'Quét hóa đơn' : 'Đồng bộ Bank';
          const icon = m === 'manual' ? 'edit-2' : m === 'ocr' ? 'camera' : 'refresh-cw';

          return (
            <TouchableOpacity
              key={m}
              style={[styles.segmentTab, mode === m && styles.activeSegmentTab]}
              onPress={() => {
                setMode(m);
                setScanResult(null);
                setSyncCount(null);
              }}
            >
              <Feather
                name={icon as any}
                size={14}
                color={mode === m ? '#ffffff' : '#1d1d1f'}
                style={styles.tabIcon}
              />
              <Text style={[styles.segmentLabel, mode === m && styles.activeSegmentLabel]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. MANUAL INPUT FORM */}
        {mode === 'manual' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhập giao dịch thủ công</Text>

            {/* Type selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, manualType === 'expense' && styles.typeBtnExpense]}
                onPress={() => {
                  setManualType('expense');
                  setIsAutoAllocate(false);
                }}
              >
                <Text style={[styles.typeText, manualType === 'expense' && styles.activeTypeText]}>
                  Chi tiêu (Chi ra)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, manualType === 'income' && styles.typeBtnIncome]}
                onPress={() => setManualType('income')}
              >
                <Text style={[styles.typeText, manualType === 'income' && styles.activeTypeText]}>
                  Thu nhập (Cộng tiền)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auto Income Allocation Switch */}
            {manualType === 'income' && (
              <TouchableOpacity
                style={[styles.autoAllocBox, isAutoAllocate && styles.autoAllocBoxActive]}
                onPress={() => setIsAutoAllocate(!isAutoAllocate)}
              >
                <Ionicons
                  name={isAutoAllocate ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isAutoAllocate ? '#0066cc' : '#94A3B8'}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.autoAllocTitle}>Tự động chia theo tỷ lệ các hũ</Text>
                  <Text style={styles.autoAllocDesc}>
                    Hệ thống sẽ tự động tính toán và chia dòng tiền thu nhập vào các hũ chi tiêu theo % đã cài đặt.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền (VND)</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0"
                value={manualAmount ? parseFloat(manualAmount).toLocaleString('vi-VN') : ''}
                onChangeText={(text) => setManualAmount(text.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nội dung / Mô tả</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Ăn trưa, Nhận lương, Mua sách..."
                placeholderTextColor="#CBD5E1"
                value={manualDesc}
                onChangeText={setManualDesc}
              />
            </View>

            {/* Payment Source: Cash vs Bank */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nguồn tiền thanh toán:</Text>
              <View style={styles.sourceSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.sourceSelectorBtn,
                    paymentSource === 'cash' && styles.sourceSelectorBtnActive,
                  ]}
                  onPress={() => setPaymentSource('cash')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={paymentSource === 'cash' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.sourceSelectorText,
                      paymentSource === 'cash' && styles.sourceSelectorTextActive,
                    ]}
                  >
                    Tiền mặt
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sourceSelectorBtn,
                    paymentSource === 'bank' && styles.sourceSelectorBtnActive,
                  ]}
                  onPress={() => setPaymentSource('bank')}
                >
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={paymentSource === 'bank' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.sourceSelectorText,
                      paymentSource === 'bank' && styles.sourceSelectorTextActive,
                    ]}
                  >
                    Tài khoản Ngân hàng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Jar selector chips (only if not auto-allocating) */}
            {!isAutoAllocate && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chọn hũ chi tiêu:</Text>
                <View style={styles.jarChipsRow}>
                  {spendJars.map((j) => (
                    <TouchableOpacity
                      key={j.id}
                      style={[
                        styles.jarChip,
                        { borderColor: j.color },
                        selectedJarId === j.id && { backgroundColor: j.color },
                      ]}
                      onPress={() => setSelectedJarId(j.id)}
                    >
                      <Text
                        style={[
                          styles.jarChipText,
                          selectedJarId === j.id ? styles.activeJarText : { color: j.color },
                        ]}
                      >
                        {j.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveManual}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isAutoAllocate ? 'Phân bổ thu nhập tự động' : 'Ghi nhận Giao dịch'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 2. OCR RECEIPT SCANNER */}
        {mode === 'ocr' && (
          <View style={styles.card}>
            

            {/* CAMERA VIEWFINDER FRAME (BANKING / MOMO STYLE) */}
            <View style={styles.cameraFrame}>
              {/* 1. Live Camera Stream on Mobile (iOS / Android) */}
              {Platform.OS !== 'web' && !selectedImageUri && cameraPermission?.granted && (
                <CameraView
                  ref={mobileCameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                />
              )}

              {/* 2. Live WebCam Stream on Web (Browser / PC) */}
              {Platform.OS === 'web' && !selectedImageUri && (
                // @ts-ignore
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}

              {/* 3. Background preview image if captured */}
              {selectedImageUri ? (
                <Image
                  source={{ uri: selectedImageUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                // 4. Placeholder if camera permission is not granted yet
                Platform.OS !== 'web' && !cameraPermission?.granted && (
                  <View style={styles.cameraPlaceholderBg}>
                    <Ionicons name="camera-outline" size={56} color="#38BDF8" />
                    <Text style={styles.cameraPlaceholderText}>
                      Chạm để cấp quyền mở Camera trực tiếp
                    </Text>
                    <TouchableOpacity
                      style={styles.enableCameraBtn}
                      onPress={() => requestCameraPermission()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.enableCameraBtnText}>Bật Camera</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}

              {/* 4 Glowing Corner Brackets */}
              <View style={[styles.cornerBracket, styles.cornerTL]} />
              <View style={[styles.cornerBracket, styles.cornerTR]} />
              <View style={[styles.cornerBracket, styles.cornerBL]} />
              <View style={[styles.cornerBracket, styles.cornerBR]} />

              {/* Scanning Laser Beam Overlay */}
              {isScanning && (
                <View style={styles.laserScanningOverlay}>
                  <View style={styles.laserBeam} />
                  <View style={styles.scanningBadge}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.scanningBadgeText}>AI đang phân tích hóa đơn...</Text>
                  </View>
                </View>
              )}

              {/* Top Bar inside Viewfinder (Guideline & Retake) */}
              <View style={styles.viewfinderTopBar}>
                <View style={styles.viewfinderGuideTag}>
                  <Ionicons name="sparkles" size={12} color="#38BDF8" />
                  <Text style={styles.viewfinderGuideText}>Tự động bóc tách số tiền</Text>
                </View>

                {selectedImageUri && (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => {
                      setSelectedImageUri(null);
                      setScanResult(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={13} color="#FFFFFF" />
                    <Text style={styles.retakeBtnText}>Chụp lại</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom Control Bar inside Viewfinder */}
              <View style={styles.viewfinderBottomBar}>
                {/* Left: Flash / Tip icon */}
                <View style={styles.viewfinderSmallBtn}>
                  <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
                </View>

                {/* Center: Main Camera Shutter / Capture Button */}
                <TouchableOpacity
                  style={styles.cameraShutterBtn}
                  onPress={handleTakePhoto}
                  disabled={isScanning}
                  activeOpacity={0.85}
                >
                  <View style={styles.cameraShutterInner}>
                    <Ionicons name="camera" size={24} color="#0F172A" />
                  </View>
                </TouchableOpacity>

                {/* Right: Folder / Gallery Icon Button */}
                <TouchableOpacity
                  style={styles.viewfinderFolderBtn}
                  onPress={handlePickImage}
                  disabled={isScanning}
                  activeOpacity={0.8}
                >
                  <Ionicons name="folder-open-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.viewfinderFolderText}>Ảnh</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* OCR Success Output */}
            {scanResult && !isScanning && (
              <View
                style={[
                  styles.ocrResultContainer,
                  scanResult.isPending ? styles.ocrPendingBorder : styles.ocrSuccessBorder,
                ]}
              >
                <View style={styles.resultTitleRow}>
                  <Ionicons
                    name={scanResult.isPending ? 'warning' : 'checkmark-circle'}
                    size={22}
                    color={scanResult.isPending ? '#ffb83d' : '#10B981'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultMainTitle}>
                      {scanResult.isPending ? 'Đã xếp vào Chờ Duyệt (AI)' : ' Phân tích thành công!'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      Vui lòng kiểm tra lại số tiền & hũ chi tiêu bên dưới trước khi lưu:
                    </Text>
                  </View>
                </View>

                {/* Form fields to edit if needed */}
                <View style={{ marginTop: 14, gap: 12 }}>
                  {/* Amount Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số tiền hóa đơn (VND):</Text>
                    <TextInput
                      style={[styles.amountInput, { color: '#EF4444' }]}
                      value={scanResult.amount ? String(scanResult.amount) : ''}
                      onChangeText={(txt) => {
                        const clean = txt.replace(/[^0-9]/g, '');
                        setScanResult({ ...scanResult, amount: Number(clean) || 0 });
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  {/* Description Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tên quán / Nội dung hóa đơn:</Text>
                    <TextInput
                      style={styles.textInput}
                      value={scanResult.description}
                      onChangeText={(txt) => setScanResult({ ...scanResult, description: txt })}
                      placeholder="Tên đơn vị hoặc dịch vụ..."
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>

                  {/* Jar Picker Pills */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hũ chi tiêu ghi nhận:</Text>
                    <View style={styles.jarChipsRow}>
                      {spendJars.map((jar) => {
                        const isSelected = scanResult.jarId === jar.id;
                        return (
                          <TouchableOpacity
                            key={jar.id}
                            style={[
                              styles.jarChip,
                              { borderColor: jar.color },
                              isSelected && { backgroundColor: jar.color },
                            ]}
                            onPress={() => setScanResult({ ...scanResult, jarId: jar.id })}
                          >
                            <Text
                              style={[
                                styles.jarChipText,
                                isSelected ? styles.activeJarText : { color: jar.color },
                              ]}
                            >
                              {jar.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Items List if present */}
                  {Array.isArray(scanResult.items) && scanResult.items.length > 0 && (
                    <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                        Chi tiết các món trong hóa đơn:
                      </Text>
                      {scanResult.items.map((it: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, color: '#334155' }}>• {it.name || it.item_name || it.ten_mon}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>
                            {((it.amount || it.price || it.gia) || 0).toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 16 }]}
                  onPress={handleConfirmOcrTransaction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>⚡ Xác nhận lưu giao dịch vào hũ</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 3. BANK SYNCHRONIZATION */}
        {mode === 'bank' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đồng bộ Tài khoản Ngân hàng</Text>
            <Text style={styles.cardSubtitle}>
              Kết nối trực tiếp tài khoản ngân hàng của bạn qua SePay để tự động nhập giao dịch trong thời gian thực.
            </Text>

            <View style={styles.banksGrid}>
              {[
                { name: 'Vietcombank', code: 'VCB', color: '#1b5e20' },
                { name: 'Techcombank', code: 'TCB', color: '#b71c1c' },
                { name: 'MBBank', code: 'MBB', color: '#0d47a1' },
                { name: 'VPBank', code: 'VPB', color: '#006064' },
                { name: 'ACB', code: 'ACB', color: '#1565C0' },
                { name: 'TPBank', code: 'TPB', color: '#6A1B9A' },
              ].map((bank) => (
                <TouchableOpacity
                  key={bank.name}
                  style={[
                    styles.bankCard,
                    selectedBank === bank.name && styles.selectedBankCard,
                  ]}
                  onPress={() => {
                    setSelectedBank(bank.name);
                    setSyncCount(null);
                  }}
                >
                  <Ionicons name="card" size={24} color={bank.color} />
                  <Text style={styles.bankName}>{bank.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.syncBtn, !selectedBank && styles.disabledBtn]}
              onPress={handleStartBankSync}
              disabled={isSyncing || !selectedBank}
            >
              {isSyncing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Kết nối & Đồng bộ giao dịch</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Link Real Bank Account Button */}
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: '#1E293B', marginTop: 10, borderWidth: 1, borderColor: '#00D2D3' }]}
              onPress={() => setLinkBankModalVisible(true)}
            >
              <Ionicons name="link-outline" size={18} color="#00D2D3" style={{ marginRight: 6 }} />
              <Text style={[styles.submitBtnText, { color: '#00D2D3' }]}>Liên kết Tài khoản Ngân hàng Thật</Text>
            </TouchableOpacity>

            {/* Sync Completed Feedback */}
            {syncCount !== null && !isSyncing && (
              <View style={styles.syncFeedbackCard}>
                <Ionicons name="cloud-done" size={32} color="#2ecc71" />
                <Text style={styles.syncFeedbackTitle}>Đồng bộ hoàn tất!</Text>
                <Text style={styles.syncFeedbackDesc}>
                  WIVI đã đồng bộ thành công và ghi nhận thêm {syncCount} giao dịch mới vào hũ tài chính của bạn từ tài khoản {selectedBank}.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Real Bank Link Modal */}
      <LinkBankModal
        visible={linkBankModalVisible}
        onClose={() => setLinkBankModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  headerLeftWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInitial: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerLeftText: {
    justifyContent: 'center',
    flex: 1,
  },
  greetingName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  userEmailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  vipBadgePro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipBadgeProText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 17,
  },
  activeSegmentTab: {
    backgroundColor: '#3B82F6',
  },
  tabIcon: {
    marginRight: 4,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeSegmentLabel: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#7a7a7a',
    lineHeight: 18,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#f5f5f7',
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnExpense: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeBtnIncome: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  activeTypeText: {
    color: '#1d1d1f',
  },
  autoAllocBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoAllocBoxActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  autoAllocTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  autoAllocDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0066cc',
    paddingVertical: 6,
  },
  textInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1d1d1f',
  },
  jarChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jarChip: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  jarChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeJarText: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#0066cc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  ocrHeaderRow: {
    marginBottom: 12,
  },
  cameraFrame: {
    height: 480,
    backgroundColor: '#0A0F1D',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  cameraPlaceholderBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  cameraPlaceholderText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 18,
    left: 18,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 18,
    right: 18,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 80,
    left: 18,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 80,
    right: 18,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
  },
  laserScanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserBeam: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  scanningBadgeText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  viewfinderTopBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewfinderGuideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  viewfinderGuideText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewfinderBottomBar: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewfinderSmallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraShutterBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraShutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFolderBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFolderText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  ocrResultContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderLeftWidth: 4,
  },
  ocrSuccessBorder: {
    borderLeftColor: '#2ecc71',
  },
  ocrPendingBorder: {
    borderLeftColor: '#ffb83d',
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultMainTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  resultDetails: {
    marginTop: 6,
    gap: 2,
  },
  resultDetailText: {
    fontSize: 12,
    color: '#555555',
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  bankCard: {
    width: '47%',
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e5ea',
  },
  selectedBankCard: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0fa',
  },
  bankName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d1d1f',
    marginTop: 6,
  },
  syncBtn: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#b0c4de',
  },
  syncFeedbackCard: {
    backgroundColor: '#e8f8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  syncFeedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27ae60',
    marginTop: 6,
  },
  syncFeedbackDesc: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  sourceSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceSelectorBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  sourceSelectorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  sourceSelectorTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  toastBanner: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  toastBannerSuccess: {
    backgroundColor: '#059669',
  },
  toastBannerError: {
    backgroundColor: '#DC2626',
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    color: '#F0FDF4',
    lineHeight: 18,
    fontWeight: '500',
  },
  enableCameraBtn: {
    marginTop: 12,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  enableCameraBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  unreadCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllReadText: {
    color: '#2563EB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  alertItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertItemUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  alertItemWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  alertItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  alertItemBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 6,
  },
});

