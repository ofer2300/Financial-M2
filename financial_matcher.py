import pandas as pd
import numpy as np
from datetime import datetime
import streamlit as st
from supabase import create_client
import os
from dotenv import load_dotenv
from data_cleaner import DataCleaner
import pdfplumber
import pytesseract
from PIL import Image
import io
import re

# טעינת הגדרות סביבה
load_dotenv()

class PDFProcessor:
    @staticmethod
    def extract_text_from_pdf(pdf_file):
        """חילוץ טקסט מקובץ PDF"""
        text = ""
        try:
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            st.error(f"שגיאה בקריאת קובץ PDF: {str(e)}")
            return None
        return text
    
    @staticmethod
    def extract_data_from_text(text, doc_type):
        """חילוץ נתונים מטקסט"""
        data = {
            'date': None,
            'amount': None,
            'reference': None
        }
        
        if text:
            # חיפוש תאריך
            date_pattern = r'\d{1,2}[./]\d{1,2}[./]\d{2,4}'
            dates = re.findall(date_pattern, text)
            if dates:
                data['date'] = dates[0]
            
            # חיפוש סכום
            amount_pattern = r'₪?\s*[\d,]+\.?\d*'
            amounts = re.findall(amount_pattern, text)
            if amounts:
                # ניקוי והמרה למספר
                amount = amounts[0].replace('₪', '').replace(',', '').strip()
                try:
                    data['amount'] = float(amount)
                except:
                    pass
            
            # חיפוש מספר אסמכתא לפי סוג המסמך
            if doc_type == 'invoice':
                ref_pattern = r'חשבונית\s*מס[׳\']?\s*[:#]?\s*(\d+)'
            else:  # receipt
                ref_pattern = r'קבלה\s*מס[׳\']?\s*[:#]?\s*(\d+)'
            
            ref_match = re.search(ref_pattern, text)
            if ref_match:
                data['reference'] = ref_match.group(1)
        
        return data

class SupabaseClient:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("נא להגדיר את פרטי ההתחברות ל-Supabase בקובץ .env")
            
        self.client = create_client(supabase_url, supabase_key)
    
    def insert_transactions(self, df, table_name):
        """הכנסת נתונים לטבלה מתאימה"""
        records = df.to_dict('records')
        
        # העלאת הנתונים במנות של 100 רשומות
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table(table_name).insert(batch).execute()
            except Exception as e:
                st.error(f"שגיאה בהעלאת נתונים לטבלה {table_name}: {str(e)}")
                raise e
    
    def process_matches(self):
        """ביצוע וקבלת התאמות באופן אוטומטי"""
        try:
            # הרצת פונקציית ההתאמה עם ערכי ברירת מחדל
            self.client.rpc('save_best_matches').execute()
            
            # קבלת תוצאות ההתאמה
            results = self.client.rpc('get_match_details').execute()
            return pd.DataFrame(results.data)
            
        except Exception as e:
            st.error(f"שגיאה בביצוע התאמות: {str(e)}")
            raise e

class FinancialMatcher:
    def __init__(self):
        try:
            self.supabase = SupabaseClient()
        except Exception as e:
            st.error(f"שגיאה בהתחברות ל-Supabase: {str(e)}")
            self.supabase = None
        
        self.pdf_processor = PDFProcessor()
    
    def load_excel_file(self, file, file_type):
        """טעינת קובץ אקסל"""
        try:
            if file.name.endswith('.xlsx'):
                df = pd.read_excel(file)
            elif file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                raise ValueError("פורמט קובץ לא נתמך. נא להשתמש ב-CSV או Excel")
            
            # ניקוי הנתונים
            cleaning_functions = {
                'bank': DataCleaner.clean_bank_transactions,
                'checks': DataCleaner.clean_checks,
                'transfers': DataCleaner.clean_transfers
            }
            
            df = cleaning_functions[file_type](df)
            
            # שמירה בטבלה המתאימה
            table_mapping = {
                'bank': 'bank_transactions',
                'checks': 'checks',
                'transfers': 'bank_transfers'
            }
            
            self.supabase.insert_transactions(df, table_mapping[file_type])
            return True
            
        except Exception as e:
            st.error(f"שגיאה בטעינת הקובץ: {str(e)}")
            return False
    
    def process_pdf_file(self, file, doc_type):
        """עיבוד קובץ PDF"""
        try:
            # חילוץ טקסט מה-PDF
            text = self.pdf_processor.extract_text_from_pdf(file)
            if not text:
                return False
            
            # חילוץ נתונים מהטקסט
            data = self.pdf_processor.extract_data_from_text(text, doc_type)
            if not all(data.values()):
                st.warning(f"לא ניתן היה לחלץ את כל הנתונים מהקובץ {file.name}")
                return False
            
            # שמירה בטבלה המתאימה
            table_name = 'invoices' if doc_type == 'invoice' else 'receipts'
            df = pd.DataFrame([{
                'date': data['date'],
                'amount': data['amount'],
                f'{doc_type}_number': data['reference']
            }])
            
            self.supabase.insert_transactions(df, table_name)
            return True
            
        except Exception as e:
            st.error(f"שגיאה בעיבוד קובץ PDF: {str(e)}")
            return False
    
    def process_matches(self):
        """ביצוע התאמות"""
        if self.supabase is None:
            raise ValueError("לא ניתן לבצע התאמות ללא חיבור ל-Supabase")
        return self.supabase.process_matches()

def main():
    st.title("מערכת התאמות פיננסיות אוטומטית")
    
    matcher = FinancialMatcher()
    
    # טעינת קבצים
    st.header("העלאת קבצים")
    
    # קבצי אקסל
    bank_file = st.file_uploader("העלאת קובץ עו\"ש", type=['csv', 'xlsx'])
    if bank_file:
        if matcher.load_excel_file(bank_file, 'bank'):
            st.success("קובץ עו\"ש נטען בהצלחה")
            
    checks_file = st.file_uploader("העלאת קובץ שיקים", type=['csv', 'xlsx'])
    if checks_file:
        if matcher.load_excel_file(checks_file, 'checks'):
            st.success("קובץ שיקים נטען בהצלחה")
            
    transfers_file = st.file_uploader("העלאת קובץ העברות בנקאיות", type=['csv', 'xlsx'])
    if transfers_file:
        if matcher.load_excel_file(transfers_file, 'transfers'):
            st.success("קובץ העברות נטען בהצלחה")
    
    # קבצי PDF
    uploaded_pdfs = st.file_uploader("העלאת חשבוניות וקבלות", type=['pdf'], accept_multiple_files=True)
    if uploaded_pdfs:
        for pdf_file in uploaded_pdfs:
            # זיהוי אוטומטי של סוג המסמך
            doc_type = 'invoice' if 'חשבונית' in pdf_file.name.lower() else 'receipt'
            if matcher.process_pdf_file(pdf_file, doc_type):
                st.success(f"קובץ {pdf_file.name} עובד בהצלחה")
    
    # ביצוע התאמות אוטומטי
    if st.session_state.get('files_uploaded'):
        try:
            with st.spinner("מבצע התאמות..."):
                results = matcher.process_matches()
            
            if not results.empty:
                # הצגת תוצאות
                st.header("תוצאות ההתאמה")
                
                # קיבוץ לפי עסקאות בנק
                grouped = results.groupby('bank_transaction_id')
                for bank_id, group in grouped:
                    first_row = group.iloc[0]
                    st.write(f"### עסקת בנק: {first_row['bank_date']} - {first_row['bank_amount']} ש\"ח")
                    if first_row['bank_description']:
                        st.write(f"תיאור: {first_row['bank_description']}")
                    
                    st.write("התאמות שנמצאו:")
                    for _, match in group.iterrows():
                        st.write(f"- {match['matched_table']}: {match['matched_date']} - {match['matched_amount']} ש\"ח")
                        if match['matched_reference']:
                            st.write(f"  מספר אסמכתא: {match['matched_reference']}")
                    
                    st.markdown("---")
            else:
                st.info("לא נמצאו התאמות")
                
        except Exception as e:
            st.error(f"אירעה שגיאה בעיבוד הנתונים: {str(e)}")
    
    # עדכון סטטוס העלאת קבצים
    if bank_file or checks_file or transfers_file or uploaded_pdfs:
        st.session_state.files_uploaded = True

if __name__ == "__main__":
    main() 