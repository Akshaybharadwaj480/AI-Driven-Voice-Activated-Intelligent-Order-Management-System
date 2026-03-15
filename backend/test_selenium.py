import sys
import os

# Set headless to false for debugging so we can see what's happening
os.environ["VOICE_ASSISTANT_SELENIUM_HEADLESS"] = "false"

from voice_assistant import automate_amazon_order, automate_flipkart_order

def test_amazon():
    print("Testing Amazon...")
    success = automate_amazon_order("laptop")
    print(f"Amazon Success: {success}")

def test_flipkart():
    print("Testing Flipkart...")
    success = automate_flipkart_order("laptop")
    print(f"Flipkart Success: {success}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "flipkart":
        test_flipkart()
    else:
        test_amazon()
