import axios from 'axios';

const API_URL = 'http://172.20.10.5/api/nfc'; // Vervang met je Pico IP

const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
});

// Add retry interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || !config._retryCount) {
      config._retryCount = 3;
    }

    if (config._retryCount > 0) {
      config._retryCount -= 1;
      const delayRetry = new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
      await delayRetry;
      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

export const checkNfcStatus = async () => {
  try {
    const response = await axiosInstance.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching NFC status:', error);
    // Return a more detailed error state
    return { 
      tag_detected: false, 
      timestamp: Date.now(),
      error: true,
      message: 'Connection to NFC reader timed out'
    };
  }
};