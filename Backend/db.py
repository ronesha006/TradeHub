import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Qmzpal@0798",
        database="tradehub"
    )
    return connection