import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# טעינת הגדרות סביבה
load_dotenv()

class DashboardManager:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("נא להגדיר את פרטי ההתחברות ל-Supabase בקובץ .env")
            
        self.client = create_client(supabase_url, supabase_key)
        
    def get_all_matches(self):
        """קבלת כל ההתאמות מהמערכת"""
        try:
            results = self.client.rpc('get_match_details').execute()
            return pd.DataFrame(results.data)
        except Exception as e:
            st.error(f"שגיאה בטעינת נתוני התאמות: {str(e)}")
            return pd.DataFrame()
    
    def get_unmatched_transactions(self):
        """קבלת עסקאות ללא התאמה"""
        try:
            query = """
            SELECT bt.* 
            FROM bank_transactions bt
            LEFT JOIN transaction_matches tm ON bt.id = tm.bank_transaction_id
            WHERE tm.id IS NULL
            """
            results = self.client.rpc('execute_sql', {'query': query}).execute()
            return pd.DataFrame(results.data)
        except Exception as e:
            st.error(f"שגיאה בטעינת עסקאות ללא התאמה: {str(e)}")
            return pd.DataFrame()
    
    def get_match_statistics(self):
        """חישוב סטטיסטיקות התאמה"""
        try:
            matches = self.get_all_matches()
            unmatched = self.get_unmatched_transactions()
            
            total_transactions = len(matches) + len(unmatched)
            if total_transactions == 0:
                return {
                    'match_rate': 0,
                    'total_amount_matched': 0,
                    'total_amount_unmatched': 0,
                    'matches_by_type': {}
                }
            
            match_rate = (len(matches) / total_transactions) * 100
            total_amount_matched = matches['bank_amount'].sum() if not matches.empty else 0
            total_amount_unmatched = unmatched['amount'].sum() if not unmatched.empty else 0
            
            matches_by_type = matches['matched_table'].value_counts().to_dict() if not matches.empty else {}
            
            return {
                'match_rate': match_rate,
                'total_amount_matched': total_amount_matched,
                'total_amount_unmatched': total_amount_unmatched,
                'matches_by_type': matches_by_type
            }
        except Exception as e:
            st.error(f"שגיאה בחישוב סטטיסטיקות: {str(e)}")
            return None

def create_match_rate_chart(stats):
    """יצירת תרשים אחוז ההתאמות"""
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = stats['match_rate'],
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "אחוז ההתאמות"},
        gauge = {
            'axis': {'range': [0, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, 50], 'color': "lightgray"},
                {'range': [50, 80], 'color': "gray"},
                {'range': [80, 100], 'color': "darkgray"}
            ]
        }
    ))
    return fig

def create_matches_by_type_chart(stats):
    """יצירת תרשים התפלגות ההתאמות לפי סוג"""
    if not stats['matches_by_type']:
        return None
        
    df = pd.DataFrame(list(stats['matches_by_type'].items()), columns=['סוג', 'כמות'])
    fig = px.pie(df, values='כמות', names='סוג', title='התפלגות התאמות לפי סוג')
    return fig

def create_amounts_chart(stats):
    """יצירת תרשים השוואת סכומים"""
    fig = go.Figure(data=[
        go.Bar(name='סכום מותאם', x=['סכומים'], y=[stats['total_amount_matched']]),
        go.Bar(name='סכום לא מותאם', x=['סכומים'], y=[stats['total_amount_unmatched']])
    ])
    fig.update_layout(title='השוואת סכומים מותאמים ולא מותאמים')
    return fig

def main():
    st.title("דשבורד התאמות פיננסיות")
    
    try:
        dashboard = DashboardManager()
        
        # חישוב סטטיסטיקות
        stats = dashboard.get_match_statistics()
        if not stats:
            st.error("לא ניתן לטעון נתונים מהמערכת")
            return
        
        # הצגת מדדים עיקריים
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("אחוז התאמה", f"{stats['match_rate']:.1f}%")
        with col2:
            st.metric("סכום מותאם", f"₪{stats['total_amount_matched']:,.2f}")
        with col3:
            st.metric("סכום לא מותאם", f"₪{stats['total_amount_unmatched']:,.2f}")
        
        # הצגת תרשימים
        st.plotly_chart(create_match_rate_chart(stats))
        
        col1, col2 = st.columns(2)
        with col1:
            pie_chart = create_matches_by_type_chart(stats)
            if pie_chart:
                st.plotly_chart(pie_chart)
        with col2:
            st.plotly_chart(create_amounts_chart(stats))
        
        # הצגת עסקאות לא מותאמות
        st.header("עסקאות ללא התאמה")
        unmatched = dashboard.get_unmatched_transactions()
        if not unmatched.empty:
            st.dataframe(unmatched)
        else:
            st.info("אין עסקאות ללא התאמה")
            
    except Exception as e:
        st.error(f"שגיאה בטעינת הדשבורד: {str(e)}")

if __name__ == "__main__":
    main() 