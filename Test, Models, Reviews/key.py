import os

# Generate a random secret key
secret_key_bytes = os.urandom(24)  
secret_key_hex = secret_key_bytes.hex()  # Convert to hex
print(secret_key_hex)  
