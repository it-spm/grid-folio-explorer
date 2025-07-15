// Security utilities for input validation and XSS prevention

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate file names for security
 */
export const validateFileName = (fileName: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(fileName);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'File name cannot be empty' };
  }
  
  if (sanitized.length > 255) {
    return { isValid: false, error: 'File name must be less than 255 characters' };
  }
  
  // Check for dangerous characters
  const dangerousChars = /[\/\\:*?"<>|]/;
  if (dangerousChars.test(sanitized)) {
    return { isValid: false, error: 'File name contains invalid characters' };
  }
  
  // Check for path traversal attempts
  if (sanitized.includes('..') || sanitized.includes('./') || sanitized.includes('.\\')) {
    return { isValid: false, error: 'Invalid file name format' };
  }
  
  return { isValid: true };
};

/**
 * Validate folder names for security
 */
export const validateFolderName = (folderName: string): { isValid: boolean; error?: string } => {
  return validateFileName(folderName); // Same rules apply
};

/**
 * Validate file types for uploads
 */
export const validateFileType = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 50MB' };
  }
  
  // Allow common file types
  const allowedTypes = [
    'image/', 'video/', 'audio/', 'text/', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'application/zip', 'application/x-rar'
  ];
  
  const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
  
  if (!isAllowed) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  return { isValid: true };
};

/**
 * Escape HTML content to prevent XSS
 */
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};