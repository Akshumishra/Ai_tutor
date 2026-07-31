from uuid import uuid4
import os

from src.llm.main import run_curriculum_agent
from src.llm.curriculum_agent.prompt import INITIAL_USER_PROMPT
from src.llm.utils import load_json, append_response_json, add_message

BASE_DIR = "./chat_history/curriculum_agent"


def get_file_path(user_id: str, topic_id: str) -> str:
    user_dir = os.path.join(BASE_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, f"{topic_id}.json")


def run_curriculum(user_id: str, topic_id: str):
    path = get_file_path(user_id, topic_id)
    chat_history = load_json(path)

    while True:
        if chat_history:
            print("\n")
            user_input = input("\n[Your Response]: ").strip()
            if user_input.lower() in ("bye", "good bye"):
                break
        else: 
            user_input = INITIAL_USER_PROMPT
    
        final_data = None
        print("\n[Expert] ", end="", flush=True)
        try:
            for event in run_curriculum_agent(user_id, topic_id, chat_history,user_input):
                if event["type"] == "text":
                    print(event["data"], end="", flush=True)
                elif event["type"] == "final":
                    final_data = event["data"]

            user_input={"role": "user", "content": user_input}
            append_response_json(path, user_input)
            chat_history = add_message( final_data=final_data)
            append_response_json(path, chat_history)
        except Exception as e:
            print(e)


def main():
    USER_ID = "0249cfc3-cce2-466e-9413-dc6db145ac5c"
    TOPIC_ID = "0ce4f55a-b2bd-4364-9897-adc84ff3219e"
    # TOPIC_ID = str(uuid4())

    run_curriculum(USER_ID, TOPIC_ID)


if __name__ == "__main__":
    main()
