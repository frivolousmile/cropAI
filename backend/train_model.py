print("🔍 Starting training...")

try:
    print("📖 Reading CSV...")
    import pandas as pd
    df = pd.read_csv("Crop_recommendation.csv")
    print(f"✅ CSV loaded! Shape: {df.shape}")
    print(f"✅ First few rows:\n{df.head()}")
    
    print("🤖 Training model...")
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    import pickle
    
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[features]
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    print(f"✅ Accuracy: {accuracy:.2%}")
    
    with open("model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("💾 model.pkl SAVED!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
