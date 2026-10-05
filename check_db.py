import sqlite3
conn = sqlite3.connect(r'C:\Users\LENOVO\Desktop\pias\backend\pias_dev.db')
cursor = conn.cursor()

# List tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print('Tables:', [t[0] for t in tables])

# Check session table
cursor.execute('PRAGMA table_info(sessions)')
print('\nsessions columns:')
for c in cursor.fetchall():
    print(f'  {c}')

# Check how many rows
for table in ['users', 'sessions', 'knowledge_nodes', 'messages']:
    try:
        cursor.execute(f'SELECT COUNT(*) FROM {table}')
        cnt = cursor.fetchone()[0]
        print(f'{table}: {cnt} rows')
    except:
        print(f'{table}: table does not exist')

conn.close()
