import os
import csv
import random

SENSITIVE_COLUMNS = {
    'ip_address': lambda: f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
    'mail': lambda: f"user_{random.randint(1000,9999)}@example.com",
    'name': lambda: "Utente Anonimo",
    'username': lambda: f"user_{random.randint(1000,9999)}",
    'screen_name': lambda: f"user_{random.randint(1000,9999)}",
    'password': lambda: "********",
    'password_new': lambda: "********",
    'hash': lambda: "fake_hash_value",
    'facebook_id': lambda: str(random.randint(100000000, 999999999)),
    'twitter_id': lambda: str(random.randint(100000000, 999999999)),
    'tumblr_id': lambda: f"tumblr_{random.randint(10000,99999)}",
    'fb_access_token': lambda: "fake_fb_token",
    'twitter_oauth_token': lambda: "fake_tw_token",
    'twitter_oauth_token_secret': lambda: "fake_tw_secret",
    'tumblr_oauth_token': lambda: "fake_tu_token",
    'tumblr_oauth_token_secret': lambda: "fake_tu_secret",
    'device_token': lambda: "fake_device_token",
    'device_id': lambda: f"dev_{random.randint(10000,99999)}",
    'appsflyer_device_id': lambda: f"af_{random.randint(10000,99999)}",
    'token': lambda: "fake_token",
    'validation_token': lambda: "fake_validation_token",
    'country_name': lambda: "Paese Nascosto",
    'city_name': lambda: "Citta Nascosta",
    'zip_code': lambda: "00000",
    'latitude': lambda: "0.0",
    'longitude': lambda: "0.0",
    'location': lambda: "Posizione Nascosta"
}

def process_file(filepath):
    print(f"Controllo {filepath}...")
    temp_filepath = filepath + '.tmp'
    modified = False
    
    with open(filepath, 'r', encoding='utf-8', newline='') as infile:
        reader = csv.reader(infile)
        try:
            headers = next(reader)
        except StopIteration:
            return # Empty file
        
        # Check if there are columns to anonymize
        col_indices_to_change = {}
        for idx, header in enumerate(headers):
            if header in SENSITIVE_COLUMNS:
                col_indices_to_change[idx] = header
        
        # Special case for files with generic 'value' columns that contain personal data
        if os.path.basename(filepath) in ['user_personal_data.csv', 'install_tracking.csv', 'user_setting.csv']:
            if 'value' in headers:
                col_indices_to_change[headers.index('value')] = 'anonymize_all'
                
        if not col_indices_to_change:
            return

        print(f"  -> Anonimizzazione delle colonne: {[headers[i] for i in col_indices_to_change.keys()]}")
        modified = True
        
        with open(temp_filepath, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(headers)
            
            for row in reader:
                if len(row) < len(headers):
                    writer.writerow(row)
                    continue
                
                for idx, col_type in col_indices_to_change.items():
                    if idx < len(row):
                        if row[idx] == '' or row[idx].lower() == 'null':
                            continue # Leave empty values empty
                        if col_type == 'anonymize_all':
                            row[idx] = "valore_anonimizzato"
                        else:
                            row[idx] = SENSITIVE_COLUMNS[col_type]()
                writer.writerow(row)
                
    if modified:
        os.replace(temp_filepath, filepath)
    else:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

for filename in os.listdir('.'):
    if filename.endswith('.csv'):
        process_file(filename)
        
print("Anonimizzazione completata con successo.")
