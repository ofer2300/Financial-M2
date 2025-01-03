import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import calendar
import numpy as np

# טעינת הגדרות סביבה
load_dotenv()

class IntegratedDashboard:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("נא להגדיר את פרטי ההתחברות ל-Supabase בקובץ .env")
            
        self.client = create_client(supabase_url, supabase_key)
    
    def get_financial_data(self):
        """קבלת כל הנתונים הפיננסיים"""
        try:
            # נתוני עו"ש
            bank_data = self.client.table('bank_transactions').select('*').execute()
            bank_df = pd.DataFrame(bank_data.data)
            
            # נתוני התאמות
            matches_data = self.client.rpc('get_match_details').execute()
            matches_df = pd.DataFrame(matches_data.data)
            
            return bank_df, matches_df
        except Exception as e:
            st.error(f"שגיאה בטעינת נתונים: {str(e)}")
            return pd.DataFrame(), pd.DataFrame()
    
    def calculate_monthly_stats(self, bank_df, matches_df):
        """חישוב סטטיסטיקות חודשיות"""
        try:
            # המרת תאריכים
            bank_df['date'] = pd.to_datetime(bank_df['date'])
            matches_df['bank_date'] = pd.to_datetime(matches_df['bank_date'])
            
            # הוספת עמודות חודש ושנה
            bank_df['month'] = bank_df['date'].dt.month
            bank_df['year'] = bank_df['date'].dt.year
            matches_df['month'] = matches_df['bank_date'].dt.month
            matches_df['year'] = matches_df['bank_date'].dt.year
            
            # חישוב סטטיסטיקות לפי חודש
            monthly_stats = []
            
            for year in bank_df['year'].unique():
                for month in range(1, 13):
                    month_bank = bank_df[(bank_df['year'] == year) & (bank_df['month'] == month)]
                    month_matches = matches_df[(matches_df['year'] == year) & (matches_df['month'] == month)]
                    
                    if not month_bank.empty:
                        total_transactions = len(month_bank)
                        matched_transactions = len(month_matches)
                        match_rate = (matched_transactions / total_transactions * 100) if total_transactions > 0 else 0
                        
                        total_amount = month_bank['amount'].sum()
                        matched_amount = month_matches['bank_amount'].sum() if not month_matches.empty else 0
                        
                        monthly_stats.append({
                            'year': year,
                            'month': month,
                            'month_name': calendar.month_name[month],
                            'total_transactions': total_transactions,
                            'matched_transactions': matched_transactions,
                            'match_rate': match_rate,
                            'total_amount': total_amount,
                            'matched_amount': matched_amount,
                            'unmatched_amount': total_amount - matched_amount
                        })
            
            return pd.DataFrame(monthly_stats)
        except Exception as e:
            st.error(f"שגיאה בחישוב סטטיסטיקות חודשיות: {str(e)}")
            return pd.DataFrame()
    
    def create_trend_chart(self, monthly_stats):
        """יצירת תרשים מגמות"""
        fig = go.Figure()
        
        # הוספת קו מגמה לאחוז ההתאמות
        fig.add_trace(go.Scatter(
            x=monthly_stats['month_name'],
            y=monthly_stats['match_rate'],
            name='אחוז התאמות',
            line=dict(color='blue', width=2)
        ))
        
        # הוספת עמודות לסכומים
        fig.add_trace(go.Bar(
            x=monthly_stats['month_name'],
            y=monthly_stats['matched_amount'],
            name='סכום מותאם',
            marker_color='green',
            opacity=0.7
        ))
        
        fig.add_trace(go.Bar(
            x=monthly_stats['month_name'],
            y=monthly_stats['unmatched_amount'],
            name='סכום לא מותאם',
            marker_color='red',
            opacity=0.7
        ))
        
        fig.update_layout(
            title='מגמות חודשיות',
            xaxis_title='חודש',
            yaxis_title='ערך',
            barmode='stack'
        )
        
        return fig
    
    def create_completion_gauge(self, monthly_stats):
        """יצירת מד השלמת התאמות"""
        current_month = datetime.now().month
        current_stats = monthly_stats[monthly_stats['month'] == current_month].iloc[0]
        
        fig = go.Figure(go.Indicator(
            mode = "gauge+number+delta",
            value = current_stats['match_rate'],
            domain = {'x': [0, 1], 'y': [0, 1]},
            title = {'text': f"השלמת התאמות - {current_stats['month_name']}"},
            delta = {'reference': 90},  # יעד של 90%
            gauge = {
                'axis': {'range': [0, 100]},
                'bar': {'color': "darkblue"},
                'steps': [
                    {'range': [0, 60], 'color': "red"},
                    {'range': [60, 85], 'color': "yellow"},
                    {'range': [85, 100], 'color': "green"}
                ],
                'threshold': {
                    'line': {'color': "black", 'width': 4},
                    'thickness': 0.75,
                    'value': 90
                }
            }
        ))
        
        return fig

def main():
    st.set_page_config(page_title="דשבורד פיננסי משולב", layout="wide")
    st.title("דשבורד פיננסי משולב")
    
    try:
        dashboard = IntegratedDashboard()
        
        # טעינת נתונים
        bank_df, matches_df = dashboard.get_financial_data()
        if bank_df.empty or matches_df.empty:
            st.error("לא נמצאו נתונים להצגה")
            return
            
        # חישוב סטטיסטיקות חודשיות
        monthly_stats = dashboard.calculate_monthly_stats(bank_df, matches_df)
        if monthly_stats.empty:
            st.error("לא ניתן לחשב סטטיסטיקות")
            return
        
        # הצגת מדדים עיקריים לחודש הנוכחי
        current_month = datetime.now().month
        current_stats = monthly_stats[monthly_stats['month'] == current_month].iloc[0]
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("עסקאות בחודש הנוכחי", current_stats['total_transactions'])
        with col2:
            st.metric("עסקאות מותאמות", current_stats['matched_transactions'])
        with col3:
            st.metric("אחוז התאמה", f"{current_stats['match_rate']:.1f}%")
        with col4:
            st.metric("סכום לא מותאם", f"₪{current_stats['unmatched_amount']:,.2f}")
        
        # הצגת תרשימים
        col1, col2 = st.columns(2)
        
        with col1:
            st.plotly_chart(dashboard.create_completion_gauge(monthly_stats), use_container_width=True)
        
        with col2:
            # תרשים התפלגות סוגי התאמות
            match_types = matches_df['matched_table'].value_counts()
            fig = px.pie(values=match_types.values, names=match_types.index, 
                        title='התפלגות סוגי התאמות')
            st.plotly_chart(fig, use_container_width=True)
        
        # תרשים מגמות
        st.plotly_chart(dashboard.create_trend_chart(monthly_stats), use_container_width=True)
        
        # טבלת נתונים מפורטת
        st.header("נתונים חודשיים מפורטים")
        st.dataframe(monthly_stats.style.format({
            'match_rate': '{:.1f}%',
            'total_amount': '₪{:,.2f}',
            'matched_amount': '₪{:,.2f}',
            'unmatched_amount': '₪{:,.2f}'
        }))
        
    except Exception as e:
        st.error(f"שגיאה בטעינת הדשבורד: {str(e)}")

if __name__ == "__main__":
    main() 