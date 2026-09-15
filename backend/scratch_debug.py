import sqlite3
con = sqlite3.connect('sustainverse.db')
cur = con.cursor()
cur.execute("UPDATE scans SET status='FAILED' WHERE id=17 AND status='IN_PROGRESS'")
con.commit()
print('Rows updated:', cur.rowcount)
