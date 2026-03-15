import os
import re
import datetime
from typing import Any, Dict, Optional, Tuple

import pyttsx3
import requests
import speech_recognition as sr
from pymongo import MongoClient
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager
import undetected_chromedriver as uc

# Constants
UNKNOWN_COMMAND_RESPONSE = "Sorry, I didn't understand that command. Please say it again."
UNKNOWN_PRODUCT_RESPONSE = "Sorry, I didn't understand the product. Please say it again."
STOP_COMMANDS = {"stop assistant", "exit", "quit", "stop"}
VALID_COMMAND_PATTERN = "order|buy|search|cancel|track|status|modify|update|change|complete"
SUCCESS_ORDER_RESPONSE = "The product has been added to your cart."
FAILURE_ORDER_RESPONSE = "Sorry, I couldn't add the product to the cart. Please try again."

# TTS Engine
engine = pyttsx3.init()
engine.setProperty("rate", int(os.getenv("VOICE_ASSISTANT_TTS_RATE", "180")))
engine.setProperty("volume", float(os.getenv("VOICE_ASSISTANT_TTS_VOLUME", "1.0")))

def speak_response(message: str) -> None:
    """The assistant must respond using voice only (text-to-speech using pyttsx3)."""
    engine.say(message)
    engine.runAndWait()

def save_order_to_mongodb(product: str, platform: str) -> None:
    """Save the order details in MongoDB."""
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
    db_name = os.getenv("MONGODB_DB_NAME", "ai_vaom")
    collection_name = os.getenv("MONGODB_ORDERS_COLLECTION", "orders")
    
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        collection = db[collection_name]
        
        order_doc = {
            "productName": product,
            "platform": platform,
            "status": "added_to_cart",
            "timestamp": datetime.datetime.utcnow(),
            "source": "voice_assistant"
        }
        collection.insert_one(order_doc)
        print(f"DEBUG: Saved order to MongoDB: {order_doc}")
    except Exception as e:
        print(f"Error saving to MongoDB: {e}")

def _create_driver() -> webdriver.Chrome:
    timeout = int(os.getenv("VOICE_ASSISTANT_AUTOMATION_TIMEOUT", "20"))
    headless = os.getenv("VOICE_ASSISTANT_SELENIUM_HEADLESS", "false").strip().lower() == "true"
    
    options = uc.ChromeOptions()
    if headless:
        options.headless = True
        options.add_argument('--headless')

    driver = uc.Chrome(options=options)
    return driver

def _wait_and_type(driver: webdriver.Chrome, by: str, selector: str, text: str, timeout: int = 20) -> bool:
    field = WebDriverWait(driver, timeout).until(
        ec.presence_of_element_located((by, selector))
    )
    field.clear()
    field.send_keys(text)
    field.send_keys(Keys.ENTER)
    return True

import time

def _click_first_result(driver: webdriver.Chrome, selectors: list[Tuple[str, str]]) -> bool:
    for by, selector in selectors:
        try:
            element = WebDriverWait(driver, 8).until(
                ec.presence_of_element_located((by, selector))
            )
            href = element.get_attribute("href")
            if href:
                driver.get(href)
                return True
        except Exception as e:
            print(f"Skipping selector {selector} due to error: {e}")
            continue
    return False

def _click_any_action_button(driver: webdriver.Chrome, selectors: list[Tuple[str, str]]) -> bool:
    for by, selector in selectors:
        try:
            button = WebDriverWait(driver, 8).until(
                ec.presence_of_element_located((by, selector))
            )
            time.sleep(2)
            try:
                button.click()
            except Exception:
                driver.execute_script("arguments[0].click();", button)
            return True
        except Exception as e:
            print(f"Skipping action button {selector} due to error: {e}")
            continue
    return False

def _switch_to_latest_tab(driver: webdriver.Chrome) -> None:
    handles = driver.window_handles
    if handles:
        driver.switch_to.window(handles[-1])

def automate_amazon_order(product_name: str) -> bool:
    """Automate searching and adding to cart on Amazon."""
    driver = _create_driver()
    try:
        driver.get("https://www.amazon.in")
        _wait_and_type(driver, By.ID, "twotabsearchtextbox", product_name)

        if not _click_first_result(
            driver,
            [
                (By.XPATH, "(//div[@data-component-type='s-search-result']//h2//a)[1]"),
                (By.XPATH, "(//h2//a)[1]"),
                (By.CSS_SELECTOR, "div.s-main-slot div[data-component-type='s-search-result'] h2 a"),
                (By.CSS_SELECTOR, "h2 a.a-link-normal"),
            ],
        ):
            driver.save_screenshot("amazon_failed_search.png")
            return False

        _switch_to_latest_tab(driver)

        clicked = _click_any_action_button(
            driver,
            [
                (By.ID, "add-to-cart-button"),
                (By.CSS_SELECTOR, "input[name='submit.add-to-cart']"),
                (By.ID, "buy-now-button"),
            ],
        )

        return clicked
    except Exception as e:
        import traceback
        with open("err.log", "a") as f:
            f.write("AMAZON ERROR:\n")
            traceback.print_exc(file=f)
            f.write(f"Error in automate_amazon_order: {e}\n")
        return False
    finally:
        driver.quit()

def automate_flipkart_order(product_name: str) -> bool:
    """Automate searching and adding to cart on Flipkart."""
    driver = _create_driver()
    try:
        driver.get("https://www.flipkart.com")

        try:
            close_button = WebDriverWait(driver, 3).until(
                ec.element_to_be_clickable((By.XPATH, "//button[contains(text(),'✕') or contains(text(),'X')]") )
            )
            close_button.click()
        except TimeoutException:
            pass

        _wait_and_type(driver, By.NAME, "q", product_name)

        if not _click_first_result(
            driver,
            [
                (By.XPATH, "(//a[contains(@href,'/p/')])[1]"),
                (By.CSS_SELECTOR, "a[href*='/p/']"),
            ],
        ):
            driver.save_screenshot("flipkart_failed_search.png")
            return False

        _switch_to_latest_tab(driver)

        clicked = _click_any_action_button(
            driver,
            [
                (By.XPATH, "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),'add to cart')]") ,
                (By.XPATH, "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),'buy now')]") ,
            ],
        )

        return clicked
    except Exception as e:
        import traceback
        with open("err.log", "a") as f:
            f.write("FLIPKART ERROR:\n")
            traceback.print_exc(file=f)
            f.write(f"Error in automate_flipkart_order: {e}\n")
        return False
    finally:
        driver.quit()


class VoiceOnlyAssistant:
    def __init__(self) -> None:
        self.backend_url = os.getenv(
            "VOICE_ASSISTANT_BACKEND_URL", "http://localhost:4000/api/voice-command"
        )
        self.listen_timeout = float(os.getenv("VOICE_ASSISTANT_LISTEN_TIMEOUT", "6"))
        self.phrase_time_limit = float(os.getenv("VOICE_ASSISTANT_PHRASE_TIME_LIMIT", "8"))
        self.http_timeout = float(os.getenv("VOICE_ASSISTANT_HTTP_TIMEOUT", "15"))
        self.language = os.getenv("VOICE_ASSISTANT_LANGUAGE", "en-US")
        self.enable_selenium_automation = (
            os.getenv("VOICE_ASSISTANT_ENABLE_SELENIUM_AUTOMATION", "true").strip().lower() == "true"
        )

        self.recognizer = sr.Recognizer()
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.7

        self.microphone = sr.Microphone()

    def calibrate(self) -> None:
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.8)

    def listen_for_command(self) -> Optional[str]:
        try:
            with self.microphone as source:
                audio = self.recognizer.listen(
                    source,
                    timeout=self.listen_timeout,
                    phrase_time_limit=self.phrase_time_limit,
                )
            return self.recognizer.recognize_google(audio, language=self.language).strip()
        except sr.WaitTimeoutError:
            return None
        except sr.UnknownValueError:
            return None
        except sr.RequestError:
            speak_response("Speech recognition service is unavailable right now. Please try again.")
            return None

    def looks_like_valid_command(self, command: str) -> bool:
        return bool(re.search(VALID_COMMAND_PATTERN, command.lower()))

    def send_to_backend(self, command: str) -> Dict[str, Any]:
        payload = {"command": command}
        try:
            response = requests.post(self.backend_url, json=payload, timeout=self.http_timeout)
        except requests.RequestException:
            return {
                "recognized": False,
                "message": "Backend service is unreachable. Please check if the server is running.",
            }

        try:
            data = response.json()
        except ValueError:
            return {
                "recognized": False,
                "message": "I received an invalid response from the backend.",
            }

        if response.ok:
            intent = str(data.get("intent", "")).strip().lower()
            response_text = str(
                data.get("responseText")
                or data.get("message")
                or UNKNOWN_COMMAND_RESPONSE
            ).strip()

            if intent == "unknown":
                return {"recognized": False, "message": UNKNOWN_COMMAND_RESPONSE}

            return {
                "recognized": True,
                "message": response_text,
                "intent": intent,
                "order": data.get("order"),
                "openUrl": data.get("openUrl"),
            }

        message = str(data.get("message") or UNKNOWN_COMMAND_RESPONSE).strip()

        if self.looks_like_valid_command(command):
            return {"recognized": True, "message": message}

        return {"recognized": False, "message": UNKNOWN_COMMAND_RESPONSE}

    def extract_product_and_platform(self, command: str, result: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        order = result.get("order") if isinstance(result.get("order"), dict) else {}

        product_name = str(order.get("productName") or "").strip().lower() or None
        platform = str(order.get("platform") or "").strip().lower() or None

        open_url = str(result.get("openUrl") or "").strip().lower()

        if not platform and "amazon" in open_url:
            platform = "amazon"
        elif not platform and "flipkart" in open_url:
            platform = "flipkart"

        if not product_name:
            created_match = re.search(
                r"(?:order|buy|purchase|search(?:\s+for)?|find|open)\s+([a-z0-9][a-z0-9\s\-]{1,80}?)(?:\s+from\s+(amazon|flipkart)|\s+on\s+(amazon|flipkart)|$)",
                command.lower(),
            )
            if created_match:
                product_name = created_match.group(1).strip()

        if not platform:
            platform_match = re.search(r"\b(amazon|flipkart)\b", command.lower())
            if platform_match:
                platform = platform_match.group(1)

        return product_name, platform

    def should_automate_order(self, result: Dict[str, Any]) -> bool:
        intent = str(result.get("intent") or "").lower()
        return intent in {"create_order", "browse_product"}

    def run(self) -> None:
        self.calibrate()
        speak_response("Voice assistant is ready. Please say your command.")

        while True:
            command = self.listen_for_command()

            if not command:
                speak_response(UNKNOWN_PRODUCT_RESPONSE)
                continue

            if command.lower() in STOP_COMMANDS:
                speak_response("Stopping voice assistant.")
                break

            result = self.send_to_backend(command)
            
            if not result.get("recognized"):
                speak_response(UNKNOWN_PRODUCT_RESPONSE)
                continue

            if not self.enable_selenium_automation or not self.should_automate_order(result):
                speak_response(str(result.get("message") or UNKNOWN_COMMAND_RESPONSE))
                continue

            product_name, platform = self.extract_product_and_platform(command, result)

            if not product_name or not platform:
                speak_response(UNKNOWN_PRODUCT_RESPONSE)
                continue

            # Modular approach execution
            success = False
            if platform == "amazon":
                success = automate_amazon_order(product_name)
            elif platform == "flipkart":
                success = automate_flipkart_order(product_name)
            
            if success:
                save_order_to_mongodb(product_name, platform)
                speak_response(SUCCESS_ORDER_RESPONSE)
            else:
                speak_response(FAILURE_ORDER_RESPONSE)


if __name__ == "__main__":
    assistant = VoiceOnlyAssistant()
    assistant.run()
