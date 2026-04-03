const fs = require('fs');
const path = require('path');

// Format currency to IDR
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date to Indonesian format
exports.formatDate = (date, format = 'full') => {
  const d = new Date(date);
  const options = {
    full: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    date: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    },
    time: { 
      hour: '2-digit', 
      minute: '2-digit' 
    }
  };
  
  return d.toLocaleDateString('id-ID', options[format]);
};

// Calculate time ago
exports.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' tahun yang lalu';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' bulan yang lalu';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' hari yang lalu';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' jam yang lalu';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' menit yang lalu';
  
  return Math.floor(seconds) + ' detik yang lalu';
};

// Generate random string
exports.generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Validate email format
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return re.test(email);
};

// Validate URL format
exports.isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize text (remove HTML tags)
exports.sanitizeText = (text) => {
  return text.replace(/<[^>]*>/g, '');
};

// Truncate text
exports.truncateText = (text, length = 100) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Calculate average rating
exports.calculateAverageRating = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return sum / ratings.length;
};

// Paginate data
exports.paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {};
  
  if (endIndex < data.length) {
    results.next = {
      page: page + 1,
      limit: limit
    };
  }
  
  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit
    };
  }
  
  results.results = data.slice(startIndex, endIndex);
  results.total = data.length;
  results.totalPages = Math.ceil(data.length / limit);
  results.currentPage = page;
  
  return results;
};

// Check if file exists
exports.fileExists = (filePath) => {
  return fs.existsSync(path.join(__dirname, '..', filePath));
};

// Get file extension
exports.getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Format bytes to human readable
exports.formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Deep clone object
exports.deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
exports.isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0;
};

// Remove duplicates from array
exports.removeDuplicates = (arr, key) => {
  if (!key) return [...new Set(arr)];
  
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Group array by key
exports.groupBy = (arr, key) => {
  return arr.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
};

// Sleep function
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
exports.retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await exports.sleep(delay);
    return exports.retry(fn, retries - 1, delay * 2);
  }
};