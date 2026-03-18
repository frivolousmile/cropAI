import requests

url = "http://localhost:5000/predict"
data = {
    "N": 50,
    "P": 30, 
    "K": 40,
    "temperature": 25,
    "humidity": 80,
    "ph": 6.5,
    "rainfall": 100
}

response = requests.post(url, json=data)
print(response.json())
