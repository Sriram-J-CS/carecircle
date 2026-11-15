"""Starter directory data (hospitals, sample doctors, medicines).

This is a STARTER SET (~145 well-known hospitals). For the full India list, load a real dataset:
    python scripts/import_csv.py hospitals  my_hospitals.csv
    python scripts/import_csv.py medicines  a_z_medicines.csv
    python scripts/import_csv.py doctors    my_doctors.csv
Doctors seeded here are SAMPLE names (is_sample=1) so the demo never shows a real person's name
attached to the wrong hospital.
"""
from .db import connect, q1

# (name, city, state, kind)
HOSPITALS = [
    # Delhi NCR
    ("AIIMS New Delhi", "New Delhi", "Delhi", "government"), ("Safdarjung Hospital", "New Delhi", "Delhi", "government"),
    ("Dr. Ram Manohar Lohia Hospital", "New Delhi", "Delhi", "government"), ("Sir Ganga Ram Hospital", "New Delhi", "Delhi", "private"),
    ("Indraprastha Apollo Hospitals", "New Delhi", "Delhi", "private"), ("Max Super Speciality Hospital, Saket", "New Delhi", "Delhi", "private"),
    ("Fortis Escorts Heart Institute", "New Delhi", "Delhi", "private"), ("BLK-Max Super Speciality Hospital", "New Delhi", "Delhi", "private"),
    ("Rajiv Gandhi Cancer Institute", "New Delhi", "Delhi", "private"), ("Moolchand Medcity", "New Delhi", "Delhi", "private"),
    ("Medanta - The Medicity", "Gurugram", "Haryana", "private"), ("Fortis Memorial Research Institute", "Gurugram", "Haryana", "private"),
    ("Artemis Hospital", "Gurugram", "Haryana", "private"), ("Jaypee Hospital", "Noida", "Uttar Pradesh", "private"),
    ("Fortis Hospital Noida", "Noida", "Uttar Pradesh", "private"), ("Kailash Hospital", "Noida", "Uttar Pradesh", "private"),
    # Mumbai / Pune / Maharashtra
    ("Kokilaben Dhirubhai Ambani Hospital", "Mumbai", "Maharashtra", "private"), ("Lilavati Hospital", "Mumbai", "Maharashtra", "private"),
    ("Breach Candy Hospital", "Mumbai", "Maharashtra", "private"), ("Jaslok Hospital", "Mumbai", "Maharashtra", "private"),
    ("Tata Memorial Hospital", "Mumbai", "Maharashtra", "government"), ("P. D. Hinduja Hospital", "Mumbai", "Maharashtra", "private"),
    ("Nanavati Max Super Speciality Hospital", "Mumbai", "Maharashtra", "private"), ("Bombay Hospital", "Mumbai", "Maharashtra", "private"),
    ("Wockhardt Hospital, Mumbai Central", "Mumbai", "Maharashtra", "private"), ("Fortis Hospital, Mulund", "Mumbai", "Maharashtra", "private"),
    ("Global Hospital, Parel", "Mumbai", "Maharashtra", "private"), ("KEM Hospital", "Mumbai", "Maharashtra", "government"),
    ("Sir H. N. Reliance Foundation Hospital", "Mumbai", "Maharashtra", "private"),
    ("Ruby Hall Clinic", "Pune", "Maharashtra", "private"), ("Jehangir Hospital", "Pune", "Maharashtra", "private"),
    ("Deenanath Mangeshkar Hospital", "Pune", "Maharashtra", "private"), ("Sahyadri Hospital", "Pune", "Maharashtra", "private"),
    ("Aditya Birla Memorial Hospital", "Pune", "Maharashtra", "private"), ("AIIMS Nagpur", "Nagpur", "Maharashtra", "government"),
    ("Kingsway Hospitals", "Nagpur", "Maharashtra", "private"),
    # Tamil Nadu / Puducherry
    ("Apollo Hospitals, Greams Road", "Chennai", "Tamil Nadu", "private"), ("MIOT International", "Chennai", "Tamil Nadu", "private"),
    ("Fortis Malar Hospital", "Chennai", "Tamil Nadu", "private"), ("Sri Ramachandra Medical Centre", "Chennai", "Tamil Nadu", "private"),
    ("Kauvery Hospital, Alwarpet", "Chennai", "Tamil Nadu", "private"), ("Vijaya Hospital", "Chennai", "Tamil Nadu", "private"),
    ("Gleneagles Global Health City", "Chennai", "Tamil Nadu", "private"), ("Madras Medical Mission", "Chennai", "Tamil Nadu", "private"),
    ("Billroth Hospitals", "Chennai", "Tamil Nadu", "private"), ("SIMS Hospital (SRM Institutes for Medical Science)", "Chennai", "Tamil Nadu", "private"),
    ("Rajiv Gandhi Government General Hospital", "Chennai", "Tamil Nadu", "government"), ("Sankara Nethralaya", "Chennai", "Tamil Nadu", "private"),
    ("Meenakshi Mission Hospital", "Madurai", "Tamil Nadu", "private"), ("Apollo Speciality Hospitals, Madurai", "Madurai", "Tamil Nadu", "private"),
    ("PSG Hospitals", "Coimbatore", "Tamil Nadu", "private"), ("Kovai Medical Center and Hospital (KMCH)", "Coimbatore", "Tamil Nadu", "private"),
    ("G. Kuppuswamy Naidu Memorial Hospital", "Coimbatore", "Tamil Nadu", "private"), ("Ganga Hospital", "Coimbatore", "Tamil Nadu", "private"),
    ("Christian Medical College (CMC) Vellore", "Vellore", "Tamil Nadu", "private"), ("Kauvery Hospital, Trichy", "Tiruchirappalli", "Tamil Nadu", "private"),
    ("JIPMER", "Puducherry", "Puducherry", "government"),
    # Karnataka
    ("Manipal Hospital, Old Airport Road", "Bengaluru", "Karnataka", "private"), ("Narayana Health City", "Bengaluru", "Karnataka", "private"),
    ("Apollo Hospitals, Bannerghatta Road", "Bengaluru", "Karnataka", "private"), ("Fortis Hospital, Bannerghatta Road", "Bengaluru", "Karnataka", "private"),
    ("Sakra World Hospital", "Bengaluru", "Karnataka", "private"), ("NIMHANS", "Bengaluru", "Karnataka", "government"),
    ("Aster CMI Hospital", "Bengaluru", "Karnataka", "private"), ("St. John's Medical College Hospital", "Bengaluru", "Karnataka", "private"),
    ("Kidwai Memorial Institute of Oncology", "Bengaluru", "Karnataka", "government"), ("Sri Jayadeva Institute of Cardiovascular Sciences", "Bengaluru", "Karnataka", "government"),
    ("JSS Hospital", "Mysuru", "Karnataka", "private"),
    # Telangana / Andhra
    ("Apollo Hospitals, Jubilee Hills", "Hyderabad", "Telangana", "private"), ("Yashoda Hospitals, Secunderabad", "Hyderabad", "Telangana", "private"),
    ("KIMS Hospitals", "Hyderabad", "Telangana", "private"), ("AIG Hospitals", "Hyderabad", "Telangana", "private"),
    ("CARE Hospitals, Banjara Hills", "Hyderabad", "Telangana", "private"), ("Nizam's Institute of Medical Sciences (NIMS)", "Hyderabad", "Telangana", "government"),
    ("Continental Hospitals", "Hyderabad", "Telangana", "private"), ("Sunshine Hospitals", "Hyderabad", "Telangana", "private"),
    ("L V Prasad Eye Institute", "Hyderabad", "Telangana", "private"), ("Osmania General Hospital", "Hyderabad", "Telangana", "government"),
    ("Apollo Hospitals, Visakhapatnam", "Visakhapatnam", "Andhra Pradesh", "private"), ("KIMS ICON Hospital", "Visakhapatnam", "Andhra Pradesh", "private"),
    ("Manipal Hospital, Vijayawada", "Vijayawada", "Andhra Pradesh", "private"),
    # Kerala
    ("Amrita Institute of Medical Sciences", "Kochi", "Kerala", "private"), ("Aster Medcity", "Kochi", "Kerala", "private"),
    ("Lisie Hospital", "Kochi", "Kerala", "private"), ("Rajagiri Hospital", "Kochi", "Kerala", "private"),
    ("KIMS Health, Thiruvananthapuram", "Thiruvananthapuram", "Kerala", "private"), ("Sree Chitra Tirunal Institute (SCTIMST)", "Thiruvananthapuram", "Kerala", "government"),
    ("Regional Cancer Centre", "Thiruvananthapuram", "Kerala", "government"), ("Government Medical College Kozhikode", "Kozhikode", "Kerala", "government"),
    ("Baby Memorial Hospital", "Kozhikode", "Kerala", "private"), ("Meitra Hospital", "Kozhikode", "Kerala", "private"),
    ("Jubilee Mission Medical College", "Thrissur", "Kerala", "private"),
    # West Bengal / East / North-East
    ("AMRI Hospital, Dhakuria", "Kolkata", "West Bengal", "private"), ("Apollo Gleneagles Hospital", "Kolkata", "West Bengal", "private"),
    ("Fortis Hospital, Anandapur", "Kolkata", "West Bengal", "private"), ("Medica Superspecialty Hospital", "Kolkata", "West Bengal", "private"),
    ("Peerless Hospital", "Kolkata", "West Bengal", "private"), ("SSKM Hospital (IPGMER)", "Kolkata", "West Bengal", "government"),
    ("Tata Medical Center", "Kolkata", "West Bengal", "private"), ("Woodlands Multispeciality Hospital", "Kolkata", "West Bengal", "private"),
    ("AIIMS Bhubaneswar", "Bhubaneswar", "Odisha", "government"), ("Apollo Hospitals, Bhubaneswar", "Bhubaneswar", "Odisha", "private"),
    ("Kalinga Institute of Medical Sciences (KIMS)", "Bhubaneswar", "Odisha", "private"), ("AIIMS Patna", "Patna", "Bihar", "government"),
    ("Paras HMRI Hospital", "Patna", "Bihar", "private"), ("RIMS Ranchi", "Ranchi", "Jharkhand", "government"),
    ("Medanta Hospital, Ranchi", "Ranchi", "Jharkhand", "private"), ("GNRC Hospitals", "Guwahati", "Assam", "private"),
    ("Down Town Hospital", "Guwahati", "Assam", "private"), ("Gauhati Medical College and Hospital", "Guwahati", "Assam", "government"),
    # Gujarat / Rajasthan / MP / Chhattisgarh
    ("Apollo Hospitals International", "Ahmedabad", "Gujarat", "private"), ("Sterling Hospital", "Ahmedabad", "Gujarat", "private"),
    ("Zydus Hospitals", "Ahmedabad", "Gujarat", "private"), ("CIMS Hospital", "Ahmedabad", "Gujarat", "private"),
    ("Gujarat Cancer & Research Institute", "Ahmedabad", "Gujarat", "government"), ("Civil Hospital Ahmedabad", "Ahmedabad", "Gujarat", "government"),
    ("Kiran Hospital", "Surat", "Gujarat", "private"), ("SSG Hospital", "Vadodara", "Gujarat", "government"),
    ("SMS Hospital", "Jaipur", "Rajasthan", "government"), ("Fortis Escorts Hospital", "Jaipur", "Rajasthan", "private"),
    ("Manipal Hospital, Jaipur", "Jaipur", "Rajasthan", "private"), ("Narayana Multispeciality Hospital", "Jaipur", "Rajasthan", "private"),
    ("AIIMS Jodhpur", "Jodhpur", "Rajasthan", "government"), ("AIIMS Bhopal", "Bhopal", "Madhya Pradesh", "government"),
    ("Bansal Hospital", "Bhopal", "Madhya Pradesh", "private"), ("Choithram Hospital", "Indore", "Madhya Pradesh", "private"),
    ("Bombay Hospital", "Indore", "Madhya Pradesh", "private"), ("AIIMS Raipur", "Raipur", "Chhattisgarh", "government"),
    # North
    ("SGPGIMS", "Lucknow", "Uttar Pradesh", "government"), ("King George's Medical University (KGMU)", "Lucknow", "Uttar Pradesh", "government"),
    ("Medanta Hospital, Lucknow", "Lucknow", "Uttar Pradesh", "private"), ("Sir Sunderlal Hospital, BHU", "Varanasi", "Uttar Pradesh", "government"),
    ("PGIMER", "Chandigarh", "Chandigarh", "government"), ("Fortis Hospital, Mohali", "Mohali", "Punjab", "private"),
    ("Max Super Speciality Hospital, Mohali", "Mohali", "Punjab", "private"), ("Christian Medical College Ludhiana", "Ludhiana", "Punjab", "private"),
    ("Dayanand Medical College & Hospital", "Ludhiana", "Punjab", "private"), ("Max Super Speciality Hospital, Dehradun", "Dehradun", "Uttarakhand", "private"),
    ("Himalayan Institute of Medical Sciences", "Dehradun", "Uttarakhand", "private"), ("AIIMS Rishikesh", "Rishikesh", "Uttarakhand", "government"),
    ("SKIMS", "Srinagar", "Jammu & Kashmir", "government"), ("Indira Gandhi Medical College (IGMC)", "Shimla", "Himachal Pradesh", "government"),
    # Goa
    ("Goa Medical College and Hospital", "Panaji", "Goa", "government"), ("Manipal Hospital, Goa", "Panaji", "Goa", "private"),
]

SPECIALTIES = ["Cardiologist", "General Physician", "Geriatrician", "Diabetologist", "Neurologist", "Orthopedic Surgeon",
               "Pulmonologist", "Gastroenterologist", "Nephrologist", "Endocrinologist", "ENT Specialist", "Ophthalmologist"]
FIRST = ["Ananya", "Rohan", "Meera", "Karthik", "Priya", "Arjun", "Lakshmi", "Vikram", "Divya", "Suresh", "Kavya", "Naveen"]
LAST = ["Rao", "Iyer", "Sharma", "Nair", "Reddy", "Menon", "Patel", "Das", "Singh", "Krishnan", "Gupta", "Pillai"]

# (brand, generic, category)
MEDICINES = [
    ("Dolo 650", "Paracetamol 650mg", "Pain/Fever"), ("Crocin", "Paracetamol 500mg", "Pain/Fever"), ("Calpol 500", "Paracetamol", "Pain/Fever"),
    ("Combiflam", "Ibuprofen + Paracetamol", "Pain/Fever"), ("Ecosprin 75", "Aspirin 75mg", "Heart"), ("Ecosprin AV 75/10", "Aspirin + Atorvastatin", "Heart"),
    ("Clopitab 75", "Clopidogrel", "Heart"), ("Atorva 10", "Atorvastatin 10mg", "Cholesterol"), ("Atorva 20", "Atorvastatin 20mg", "Cholesterol"),
    ("Rosuvas 10", "Rosuvastatin", "Cholesterol"), ("Telma 40", "Telmisartan 40mg", "Blood pressure"), ("Telma-H", "Telmisartan + Hydrochlorothiazide", "Blood pressure"),
    ("Amlong 5", "Amlodipine 5mg", "Blood pressure"), ("Amlokind-AT", "Amlodipine + Atenolol", "Blood pressure"), ("Losar 50", "Losartan 50mg", "Blood pressure"),
    ("Met XL 25", "Metoprolol succinate", "Blood pressure"), ("Concor 5", "Bisoprolol 5mg", "Blood pressure"), ("Cardivas 3.125", "Carvedilol", "Heart"),
    ("Lasix", "Furosemide", "Diuretic"), ("Aldactone", "Spironolactone", "Diuretic"), ("Digoxin", "Digoxin", "Heart"), ("Imdur", "Isosorbide mononitrate", "Heart"),
    ("Sorbitrate", "Isosorbide dinitrate", "Heart"), ("Xarelto", "Rivaroxaban", "Blood thinner"), ("Acitrom", "Acenocoumarol", "Blood thinner"), ("Warf", "Warfarin", "Blood thinner"),
    ("Glycomet 500", "Metformin 500mg", "Diabetes"), ("Glycomet GP 1", "Metformin + Glimepiride", "Diabetes"), ("Amaryl 1", "Glimepiride", "Diabetes"),
    ("Januvia 100", "Sitagliptin", "Diabetes"), ("Jalra 50", "Vildagliptin", "Diabetes"), ("Galvus Met", "Vildagliptin + Metformin", "Diabetes"),
    ("Gluconorm G", "Metformin + Glimepiride", "Diabetes"), ("Lantus", "Insulin glargine", "Diabetes"), ("Mixtard 30", "Human insulin", "Diabetes"),
    ("Thyronorm 50", "Levothyroxine 50mcg", "Thyroid"), ("Eltroxin 100", "Levothyroxine 100mcg", "Thyroid"),
    ("Pantop 40", "Pantoprazole 40mg", "Acidity"), ("Pan D", "Pantoprazole + Domperidone", "Acidity"), ("Omez", "Omeprazole", "Acidity"),
    ("Rablet 20", "Rabeprazole", "Acidity"), ("Digene", "Antacid gel/tablet", "Acidity"), ("Gelusil MPS", "Antacid", "Acidity"), ("Eno", "Fruit salt antacid", "Acidity"),
    ("Cyclopam", "Dicyclomine + Paracetamol", "Stomach"), ("Ondem 4", "Ondansetron", "Nausea"), ("Domstal", "Domperidone", "Nausea"),
    ("Electral ORS", "Oral rehydration salts", "Hydration"), ("Norflox TZ", "Norfloxacin + Tinidazole", "Antibiotic"), ("Azithral 500", "Azithromycin", "Antibiotic"),
    ("Augmentin 625", "Amoxicillin + Clavulanate", "Antibiotic"), ("Taxim-O 200", "Cefixime", "Antibiotic"), ("Cifran 500", "Ciprofloxacin", "Antibiotic"),
    ("Metrogyl 400", "Metronidazole", "Antibiotic"), ("Cetzine", "Cetirizine 10mg", "Allergy"), ("Allegra 120", "Fexofenadine", "Allergy"),
    ("Montair LC", "Montelukast + Levocetirizine", "Allergy"), ("Sinarest", "Paracetamol + Phenylephrine + CPM", "Cold"), ("Benadryl", "Diphenhydramine syrup", "Cough"),
    ("Ascoril LS", "Levosalbutamol + Bromhexine + Guaifenesin", "Cough"), ("Alex", "Cough syrup", "Cough"),
    ("Asthalin", "Salbutamol inhaler", "Breathing"), ("Foracort 200", "Formoterol + Budesonide", "Breathing"), ("Seroflo 250", "Salmeterol + Fluticasone", "Breathing"),
    ("Duolin", "Levosalbutamol + Ipratropium", "Breathing"), ("Tiova", "Tiotropium", "Breathing"), ("Deriphyllin", "Etophylline + Theophylline", "Breathing"),
    ("Wysolone", "Prednisolone", "Steroid"), ("Volini", "Diclofenac gel", "Pain relief"), ("Moov", "Pain relief ointment", "Pain relief"),
    ("Shelcal 500", "Calcium + Vitamin D3", "Supplement"), ("Calcirol", "Cholecalciferol (Vit D3)", "Supplement"), ("Becosules", "Vitamin B-complex", "Supplement"),
    ("Neurobion Forte", "Vitamin B1 + B6 + B12", "Supplement"), ("Limcee", "Vitamin C", "Supplement"), ("Zincovit", "Multivitamin + zinc", "Supplement"),
    ("Fefol", "Iron + Folic acid", "Supplement"), ("Folvite", "Folic acid", "Supplement"), ("Liv 52", "Herbal liver tonic", "Liver"),
    ("Gabapin 100", "Gabapentin", "Nerve pain"), ("Lyrica 75", "Pregabalin", "Nerve pain"), ("Nexito 10", "Escitalopram", "Mental health"),
    ("Donep 5", "Donepezil", "Memory"), ("Syndopa 110", "Levodopa + Carbidopa", "Parkinson's"), ("Pacitane", "Trihexyphenidyl", "Parkinson's"),
    ("Urimax 0.4", "Tamsulosin", "Prostate"), ("Finast", "Finasteride", "Prostate"), ("Alendronate 70", "Alendronate", "Bone"),
    ("Sucrafil", "Sucralfate", "Acidity"), ("Hajmola", "Digestive tablet", "Digestion"), ("Pudin Hara", "Mint digestive", "Digestion"),
]


def seed_if_empty() -> None:
    conn = connect()
    try:
        if not q1(conn, "SELECT 1 FROM hospitals LIMIT 1"):
            conn.execute("BEGIN")
            conn.executemany("INSERT INTO hospitals (name, city, state, kind) VALUES (?,?,?,?)", HOSPITALS)
            rows = conn.execute("SELECT id, city, state FROM hospitals").fetchall()
            docs = []
            for i, h in enumerate(rows[: len(rows) // 2]):  # sample doctors for the first half of the hospitals
                for j in range(3):
                    n = i * 3 + j
                    docs.append((f"Dr. {FIRST[n % 12]} {LAST[(n * 5 + j) % 12]} (sample)", SPECIALTIES[(i + j * 4) % len(SPECIALTIES)], h["id"], h["city"], h["state"], 1))
            conn.executemany("INSERT INTO doctors (name, specialty, hospital_id, city, state, is_sample) VALUES (?,?,?,?,?,?)", docs)
            conn.execute("COMMIT")
        if not q1(conn, "SELECT 1 FROM medicines LIMIT 1"):
            conn.execute("BEGIN")
            conn.executemany("INSERT INTO medicines (name, generic, category) VALUES (?,?,?)", MEDICINES)
            conn.execute("COMMIT")
    finally:
        conn.close()
