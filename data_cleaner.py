import pandas as pd
import numpy as np
from datetime import datetime
import re

class DataCleaner:
    @staticmethod
    def clean_amount(amount):
        """ניקוי וטיוב שדה הסכום"""
        if pd.isna(amount):
            return None
            
        # הסרת תווים מיוחדים ורווחים
        if isinstance(amount, str):
            amount = re.sub(r'[^\d.-]', '', amount)
            try:
                amount = float(amount)
            except ValueError:
                return None
                
        return round(float(amount), 2)
    
    @staticmethod
    def clean_date(date):
        """ניקוי וטיוב שדה התאריך"""
        if pd.isna(date):
            return None
            
        if isinstance(date, str):
            # ניסיון לפרש תאריכים בפורמטים שונים
            try:
                return pd.to_datetime(date).strftime('%Y-%m-%d')
            except:
                return None
                
        if isinstance(date, (datetime, pd.Timestamp)):
            return date.strftime('%Y-%m-%d')
            
        return None
    
    @staticmethod
    def clean_text(text):
        """ניקוי וטיוב שדות טקסט"""
        if pd.isna(text):
            return None
            
        # הסרת רווחים מיותרים ותווים מיוחדים
        text = str(text).strip()
        text = re.sub(r'\s+', ' ', text)
        return text if text else None
    
    @classmethod
    def clean_bank_transactions(cls, df):
        """ניקוי נתוני עו"ש"""
        cleaned = df.copy()
        
        # ניקוי שדות
        if 'סכום' in cleaned.columns:
            cleaned['amount'] = cleaned['סכום'].apply(cls.clean_amount)
            del cleaned['סכום']
        elif 'amount' in cleaned.columns:
            cleaned['amount'] = cleaned['amount'].apply(cls.clean_amount)
            
        if 'תאריך' in cleaned.columns:
            cleaned['date'] = cleaned['תאריך'].apply(cls.clean_date)
            del cleaned['תאריך']
        elif 'date' in cleaned.columns:
            cleaned['date'] = cleaned['date'].apply(cls.clean_date)
            
        if 'תיאור' in cleaned.columns:
            cleaned['description'] = cleaned['תיאור'].apply(cls.clean_text)
            del cleaned['תיאור']
        elif 'description' in cleaned.columns:
            cleaned['description'] = cleaned['description'].apply(cls.clean_text)
            
        # הסרת שורות לא תקינות
        cleaned = cleaned.dropna(subset=['amount', 'date'])
        
        return cleaned
    
    @classmethod
    def clean_invoices(cls, df):
        """ניקוי נתוני חשבוניות"""
        cleaned = df.copy()
        
        # ניקוי שדות
        if 'סכום' in cleaned.columns:
            cleaned['amount'] = cleaned['סכום'].apply(cls.clean_amount)
            del cleaned['סכום']
        elif 'amount' in cleaned.columns:
            cleaned['amount'] = cleaned['amount'].apply(cls.clean_amount)
            
        if 'תאריך' in cleaned.columns:
            cleaned['date'] = cleaned['תאריך'].apply(cls.clean_date)
            del cleaned['תאריך']
        elif 'date' in cleaned.columns:
            cleaned['date'] = cleaned['date'].apply(cls.clean_date)
            
        if 'מספר_חשבונית' in cleaned.columns:
            cleaned['invoice_number'] = cleaned['מספר_חשבונית'].apply(cls.clean_text)
            del cleaned['מספר_חשבונית']
        elif 'invoice_number' in cleaned.columns:
            cleaned['invoice_number'] = cleaned['invoice_number'].apply(cls.clean_text)
            
        if 'סטטוס' in cleaned.columns:
            cleaned['status'] = cleaned['סטטוס'].apply(cls.clean_text)
            del cleaned['סטטוס']
        elif 'status' in cleaned.columns:
            cleaned['status'] = cleaned['status'].apply(cls.clean_text)
            
        # הסרת שורות לא תקינות
        cleaned = cleaned.dropna(subset=['amount', 'date'])
        
        return cleaned
    
    @classmethod
    def clean_receipts(cls, df):
        """ניקוי נתוני קבלות"""
        cleaned = df.copy()
        
        # ניקוי שדות בדומה לחשבוניות
        cleaned = cls.clean_invoices(cleaned)
        
        # שינוי שמות עמודות
        if 'invoice_number' in cleaned.columns:
            cleaned['receipt_number'] = cleaned['invoice_number']
            del cleaned['invoice_number']
            
        return cleaned
    
    @classmethod
    def clean_checks(cls, df):
        """ניקוי נתוני שיקים"""
        cleaned = df.copy()
        
        # ניקוי שדות בסיסיים
        cleaned = cls.clean_bank_transactions(cleaned)
        
        # ניקוי שדות ייחודיים לשיקים
        if 'מספר_שיק' in cleaned.columns:
            cleaned['check_number'] = cleaned['מספר_שיק'].apply(cls.clean_text)
            del cleaned['מספר_שיק']
        elif 'check_number' in cleaned.columns:
            cleaned['check_number'] = cleaned['check_number'].apply(cls.clean_text)
            
        if 'שם_משלם' in cleaned.columns:
            cleaned['payer_name'] = cleaned['שם_משלם'].apply(cls.clean_text)
            del cleaned['שם_משלם']
        elif 'payer_name' in cleaned.columns:
            cleaned['payer_name'] = cleaned['payer_name'].apply(cls.clean_text)
            
        return cleaned
    
    @classmethod
    def clean_transfers(cls, df):
        """ניקוי נתוני העברות בנקאיות"""
        cleaned = df.copy()
        
        # ניקוי שדות בסיסיים
        cleaned = cls.clean_bank_transactions(cleaned)
        
        # ניקוי שדות ייחודיים להעברות
        if 'מספר_אסמכתא' in cleaned.columns:
            cleaned['reference_number'] = cleaned['מספר_אסמכתא'].apply(cls.clean_text)
            del cleaned['מספר_אסמכתא']
        elif 'reference_number' in cleaned.columns:
            cleaned['reference_number'] = cleaned['reference_number'].apply(cls.clean_text)
            
        return cleaned 