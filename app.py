import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
import tensorflow as tf
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Constants and paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_KERAS_PATH = os.path.join(BASE_DIR, 'laptop_price_model.keras')
MODEL_PKL_PATH = os.path.join(BASE_DIR, 'laptop_price_prediction_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler (1).pkl')
FEATURES_PATH = os.path.join(BASE_DIR, 'features.json')
CATEGORIES_PATH = os.path.join(BASE_DIR, 'categories.json')

# Global variables for loaded assets
model = None
scaler = None
feature_names = None
categories_metadata = None

def init_assets():
    global model, scaler, feature_names, categories_metadata
    
    print("Initializing web app assets...")
    
    # 1. Load categories dropdown metadata (INSTANT)
    if os.path.exists(CATEGORIES_PATH):
        try:
            with open(CATEGORIES_PATH, 'r', encoding='utf-8') as f:
                categories_metadata = json.load(f)
            print("Loaded categories metadata.")
        except Exception as e:
            print(f"CRITICAL: Failed to load categories: {e}")
            sys.exit(1)
    else:
        print(f"CRITICAL: Categories metadata not found at {CATEGORIES_PATH}")
        sys.exit(1)
        
    # 2. Load feature names (INSTANT)
    if os.path.exists(FEATURES_PATH):
        try:
            with open(FEATURES_PATH, 'r', encoding='utf-8') as f:
                feature_names = json.load(f)
            print(f"Loaded {len(feature_names)} feature columns.")
        except Exception as e:
            print(f"CRITICAL: Failed to load features list: {e}")
            sys.exit(1)
    else:
        print(f"CRITICAL: Features list not found at {FEATURES_PATH}")
        sys.exit(1)

    # 3. Load the StandardScaler (INSTANT)
    if os.path.exists(SCALER_PATH):
        try:
            print(f"Loading StandardScaler from: {SCALER_PATH}")
            with open(SCALER_PATH, 'rb') as f:
                scaler = pickle.load(f)
            print("StandardScaler loaded successfully!")
        except Exception as e:
            print(f"CRITICAL: Failed to load scaler: {e}")
            sys.exit(1)
    else:
        print(f"CRITICAL: Scaler file not found at {SCALER_PATH}")
        sys.exit(1)

    # 4. Load the Keras ANN Model (SLOW - takes 1-2 minutes)
    if os.path.exists(MODEL_KERAS_PATH):
        try:
            print(f"Loading Keras model from native format: {MODEL_KERAS_PATH}")
            model = tf.keras.models.load_model(MODEL_KERAS_PATH)
            print("Keras model loaded successfully!")
        except Exception as e:
            print(f"Error loading native Keras model: {e}")
            
    if model is None and os.path.exists(MODEL_PKL_PATH):
        try:
            print(f"Attempting fallback to loading Keras model from pickle: {MODEL_PKL_PATH}")
            with open(MODEL_PKL_PATH, 'rb') as f:
                model = pickle.load(f)
            print("Model loaded from pickle fallback successfully!")
        except Exception as e:
            print(f"Error loading Keras model from pickle fallback: {e}")
            
    if model is None:
        print("CRITICAL: Failed to load the ANN model from both native Keras and Pickle file.")
        sys.exit(1)

# Initialize assets in a background thread to prevent Gunicorn worker startup timeout
import threading
threading.Thread(target=init_assets, daemon=True).start()


@app.route('/')
def home():
    """Renders the main glassmorphic UI page."""
    return render_template('index.html')

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """API endpoint to get the list of unique categories for the dropdown selectors."""
    if categories_metadata is None:
        return jsonify({"error": "Categories metadata is initializing in the background. Please refresh in a few seconds."}), 503
    return jsonify(categories_metadata)


@app.route('/predict', methods=['POST'])
def predict():
    """
    API endpoint that accepts laptop specification parameters, applies scaling
    and dummy-encoding exactly matching the training environment, and predicts the price.
    """
    if model is None or scaler is None or feature_names is None:
        return jsonify({
            "success": False,
            "error": "The Artificial Neural Network model is currently initializing in the background. Please wait a few seconds and try again."
        }), 503
    try:
        data = request.json

        if not data:
            return jsonify({"error": "No input data provided"}), 400
            
        # 1. Parse and validate inputs
        # Extract numerical inputs
        try:
            inches = float(data.get('Inches', 15.6))
            ram = int(data.get('Ram', 8))
            weight = float(data.get('Weight', 2.0))
        except ValueError:
            return jsonify({"error": "Numerical inputs (Inches, Ram, Weight) must be valid numbers."}), 400
            
        # Extract categorical inputs
        company = data.get('Company', '')
        type_name = data.get('TypeName', '')
        screen_resolution = data.get('ScreenResolution', '')
        cpu = data.get('Cpu', '')
        memory = data.get('Memory', '')
        gpu = data.get('Gpu', '')
        op_sys = data.get('OpSys', '')
        
        # 2. Replicate Notebook Preprocessing Flow
        # In Cell 19: df_encoded = df_encoded.astype(int)
        # This means all floats are cast to integer BEFORE scaling is applied.
        inches_int = int(inches)
        ram_int = int(ram)
        weight_int = int(weight)
        
        # Scale the integer-casted numerical features using the StandardScaler
        # In Cell 22: df_encoded[numerical_features] = scaler.fit_transform(df_encoded[numerical_features])
        numerical_df = pd.DataFrame([[inches_int, ram_int, weight_int]], columns=['Inches', 'Ram', 'Weight'])
        scaled_numerical = scaler.transform(numerical_df)[0]
        
        scaled_inches = scaled_numerical[0]
        scaled_ram = scaled_numerical[1]
        scaled_weight = scaled_numerical[2]
        
        # 3. Replicate One-Hot Encoding Column Alignment
        # We start with a dictionary representing all 337 features initialized to 0
        input_vector = {feature: 0 for feature in feature_names}
        
        # Set scaled numerical features
        input_vector['Inches'] = scaled_inches
        input_vector['Ram'] = scaled_ram
        input_vector['Weight'] = scaled_weight
        
        # Handle dummy columns for categorical variables
        # Format in get_dummies (drop_first=True): {CategoryColumnName}_{CategoryValue}
        # e.g., Company_Apple, TypeName_Gaming, OpSys_Windows 10, etc.
        inputs_categorical = {
            'Company': company,
            'TypeName': type_name,
            'ScreenResolution': screen_resolution,
            'Cpu': cpu,
            'Memory': memory,
            'Gpu': gpu,
            'OpSys': op_sys
        }
        
        for col_name, col_value in inputs_categorical.items():
            dummy_col = f"{col_name}_{col_value}"
            if dummy_col in input_vector:
                input_vector[dummy_col] = 1
                
        # 4. Construct numpy array matching exact training sequence
        input_array = np.array([[input_vector[name] for name in feature_names]], dtype=np.float32)
        
        # 5. Execute ANN inference
        prediction_raw = model.predict(input_array)
        predicted_euros = float(prediction_raw[0][0])
        
        # Ensure predicted value is non-negative
        predicted_euros = max(0.0, predicted_euros)
        
        # 6. Apply exchange rates for diverse currency conversions
        # Values are based on standard exchange rates (EUR to USD / EUR to INR)
        predicted_usd = predicted_euros * 1.09
        predicted_inr = predicted_euros * 90.50
        
        return jsonify({
            "success": True,
            "predictions": {
                "EUR": round(predicted_euros, 2),
                "USD": round(predicted_usd, 2),
                "INR": round(predicted_inr, 2)
            },
            "inputs_processed": {
                "Inches_int": inches_int,
                "Ram_int": ram_int,
                "Weight_int": weight_int,
                "Inches_scaled": float(scaled_inches),
                "Ram_scaled": float(scaled_ram),
                "Weight_scaled": float(scaled_weight)
            }
        })
        
    except Exception as e:
        print(f"Prediction Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # Start on standard port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
