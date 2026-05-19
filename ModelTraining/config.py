# ============================================================
# config.py  Audio + model configuration
#
# These parameters match the original training script.
# The EXAMPLETRAININGSCRIPT.py shows the target config for
# the JS app (N_MFCC=40, sliding windows, JSON export) —
# do not switch to those params until the baseline is confirmed.
#
# To retrain with different settings, change values below then:
#   python train.py
#   python evaluate.py
# ============================================================

# --- Audio processing ---
SAMPLE_RATE = 32000    # SR
WIN_SEC     = 0.5      # seconds per training window (tuned: was 0.3)
N_MFCC      = 30       # MFCC coefficients (tuned: sweep found 30 >> 20 >> 40)
N_FFT       = 2048     # n_fft / window size
HOP_LENGTH  = 512      # hop length

# --- Augmentation ---
AUG_NOISE_LVL = 0.3    # background noise mix ratio (0 = off)

# --- Training ---
SVM_C     = 10         # used as default; GridSearchCV will override
SVM_GAMMA = "scale"    # used as default; GridSearchCV will override
TEST_SPLIT = 0.2
