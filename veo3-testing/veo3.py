import time
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
load_dotenv()

client = genai.Client(api_key="AIzaSyApjPHBOvcLs1JsDQrl_VTNMR4JgBFCVdM")

prompt = """A software engineer speaking clearly: "Our frontend authentication centralizes API calls in api.ts, manages user state in UserContext.tsx, and creates users in ProfileSelectionScreen.tsx using api.post add_user." Shows the three key files and code snippet."""


operation = client.models.generate_videos(
    model="veo-3.0-generate-001",
    prompt=prompt,
)

# Poll the operation status until the video is ready.
while not operation.done:
    print("Waiting for video generation to complete...")
    time.sleep(10)
    operation = client.operations.get(operation)

# Download the generated video.
generated_video = operation.response.generated_videos[0]
client.files.download(file=generated_video.video)
generated_video.video.save("dialogue_example.mp4")
print("Generated video saved to dialogue_example.mp4")