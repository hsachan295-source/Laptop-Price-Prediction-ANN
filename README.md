---
title: Laptop Price Predictor Ann
emoji: 💻
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# 💻 NeuralPrice — AI Laptop Price Predictor

A sleek, modern, glassmorphic web application that uses a deep learning **Artificial Neural Network (ANN)** to predict laptop prices dynamically in real-time. The project is fully containerized using **Docker** and deployed on **Hugging Face Spaces**.

### 🔗 Live Deployment
Experience the live application here:  
👉 **[Hugging Face Space Live App](https://huggingface.co/spaces/Harsh0809/laptop-price-predictor-Ann)**

---

## 🚀 Key Features

* **AI Inference (Keras/TensorFlow)**: Runs a 4-layer Deep Multi-Layer Perceptron (MLP) model loaded and run directly on a Flask backend.
* **Glassmorphic UI**: High-end futuristic user interface built using modern CSS styling (Vanilla CSS, no bulky frameworks), responsive layouts, and smooth micro-animations.
* **Dynamic Currency Pricing**: Instantly displays estimated prices in **EUR (€)**, **USD ($)**, and **INR (₹)**.
* **Multi-Step Form Wizard**: A step-by-step form to collect specifications gracefully.
* **Futuristic Warmup Overlay**: Since TensorFlow/Keras can take up to 1-2 minutes to initialize on CPU platforms, the app uses a non-blocking background thread model loader combined with a beautiful pulsing overlay screen, preventing startup timeouts or prediction errors.
* **Robust Custom Dropdowns**: Designed with custom styling targeting native options to blend into the futuristic dark theme perfectly.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3 (Vanilla Glassmorphism), JavaScript (Vanilla ES6)
* **Backend**: Flask (Python 3.9)
* **Machine Learning**: TensorFlow 2.16+, Keras 3.x, Scikit-Learn (for StandardScaler)
* **WSGI Server**: Gunicorn
* **Containerization**: Docker
* **Deployment**: Hugging Face Spaces (Docker SDK)

---

## 📂 Project Structure

Here is a visual map of the repository structure:

```text
Laptop_price_Ann/
├── .gitattributes                      # Git LFS configuration for tracking binary files
├── .gitignore                          # Rules to exclude temp, cache, and IDE files
├── Dockerfile                          # Docker configuration for production containerization
├── README.md                           # Professional project documentation (Hugging Face metadata)
├── app.py                              # Flask server, API endpoints, and async model loading
├── categories.json                     # Dynamic dropdown selections (Brands, CPU, GPU, OS, etc.)
├── features.json                       # List of 337 input columns matching the model's structure
├── laptop_price_model.keras            # Trained Keras Artificial Neural Network (ANN) model
├── laptop_price_prediction_model.pkl   # Backup pickled Keras model
├── requirements.txt                    # Project package dependencies
├── scaler (1).pkl                      # Scikit-learn StandardScaler for numerical inputs
├── static/                             # Client-side static assets
│   ├── css/
│   │   └── style.css                   # Futuristic glassmorphism styles and dark option rules
│   └── js/
│       └── main.js                     # Step form handling, API integration, and polling checks
└── templates/
    └── index.html                      # App layout structure (includes the Warmup Overlay)
```

---

## 🧠 Model Architecture & Pipeline

The backend processes user inputs, scales numerical specifications using a saved Scikit-Learn `StandardScaler`, applies one-hot encoding dynamically mapping features to a 337-column input vector, and executes inference using a Keras ANN:

$$\text{Inputs (Inches, RAM, Weight)} \rightarrow \text{StandardScaler} \rightarrow \text{One-Hot Encoding (337 Dims)} \rightarrow \text{ANN Inference} \rightarrow \text{Price Prediction}$$

The model architecture:
* **Input Layer**: 337 features
* **Hidden Layer 1**: Dense 128 (ReLU activation) + Dropout (20%)
* **Hidden Layer 2**: Dense 128 (ReLU activation) + Dropout (20%)
* **Hidden Layer 3**: Dense 64 (ReLU activation) + Dropout (20%)
* **Hidden Layer 4**: Dense 32 (ReLU activation) + Dropout (20%)
* **Output Layer**: Dense 1 (Linear activation)

---

## 💻 Local Installation & Setup

If you want to run this project locally, follow these steps:

### Prerequisites
Make sure you have **Python 3.9+** and **Git LFS** installed.

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/hsachan295-source/Laptop-Price-Prediction-ANN.git
   cd Laptop-Price-Prediction-ANN
   ```

2. **Initialize Git LFS**:
   ```bash
   git lfs install
   git lfs pull
   ```

3. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

4. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Run the Flask App**:
   ```bash
   python app.py
   ```
   Open your browser and navigate to `http://127.0.0.1:5000`.

---

## 🐳 Running with Docker

To build and run the app locally inside a Docker container matching the Hugging Face production environment:

1. **Build the Docker Image**:
   ```bash
   docker build -t laptop-price-ann .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 7860:7860 laptop-price-ann
   ```
   Open your browser and navigate to `http://127.0.0.1:7860`.
