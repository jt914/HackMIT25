import json
import numpy as np
from manim import *
from gtts import gTTS
import os
import cloudinary
import cloudinary.uploader
import app.constants as constants

def upload_to_cloudinary(video_path):
    """
    Upload video to Cloudinary and return the shareable link.
    
    CLOUDINARY BENEFITS:
    - Max file size: 100MB (free tier), up to 4GB (paid plans)
    - No duration limits
    - Better video optimization and delivery
    - More reliable CDN
    """
    try:
        # Configure cloudinary
        cloudinary.config(
            cloud_name=constants.CLOUDINARY_CLOUD_NAME,
            api_key=constants.CLOUDINARY_API_KEY,
            api_secret=constants.CLOUDINARY_API_SECRET
        )
        
        print(f"Uploading {video_path} to Cloudinary...")
        
        # Upload video with optimization settings
        result = cloudinary.uploader.upload(
            video_path,
            resource_type="video",
            public_id=f"generated_video_{os.path.splitext(os.path.basename(video_path))[0]}",
            folder="educational_videos",
            overwrite=True,
            # Video optimization settings
            quality="auto",
            format="mp4",
            # Add tags for organization
            tags=["manim", "educational", "auto-generated"]
        )
        
        if result and result.get('secure_url'):
            link = result['secure_url']
            print(f"✅ Upload successful! Link: {link}")
            return link
        else:
            print(f"❌ Upload failed: {result}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading to Cloudinary: {str(e)}")
        return None

class TextBulletVideo(Scene):
    def construct(self):
        # This will be dynamically set by the JSON data
        pass

def create_text_bullet_video_from_json(json_file_path, output_filename="text_bullet_video.mp4", upload_to_cloudinary_flag=True):
    """
    Creates a video with narration and animated bullet points from a JSON script file
    """
    # Load the JSON script
    with open(json_file_path, 'r') as f:
        script_data = json.load(f)
    
    # Generate audio narration
    audio_filename = None
    if "audio" in script_data and "narration" in script_data["audio"]:
        tts = gTTS(
            text=script_data["audio"]["narration"], 
            lang=script_data["audio"].get("language", "en")
        )
        audio_filename = "temp_narration.mp3"
        tts.save(audio_filename)
    
    # Create a temporary Python file for manim
    temp_scene_file = "temp_text_scene.py"
    
    scene_code = f'''
import json
import numpy as np
from manim import *

class TextBulletScene(Scene):
    def construct(self):
        script_data = {json.dumps(script_data, indent=2)}
        
        # Create title
        title = Text(script_data["title"], font_size=36, color=WHITE)
        title.move_to(UP * 2.5)
        self.play(Write(title))
        self.wait(1)
        
        # Get bullet points and timing
        bullets = script_data["bullets"]
        timing = script_data.get("timing", {{}})
        
        # Create bullet points with text wrapping
        bullet_objects = []
        max_chars_per_line = 60  # Maximum characters per line
        
        for i, bullet in enumerate(bullets):
            bullet_content = bullet['text']
            
            # Wrap long text to multiple lines
            if len(bullet_content) > max_chars_per_line:
                # Split into multiple lines at word boundaries
                words = bullet_content.split()
                lines = []
                current_line = ""
                
                for word in words:
                    if len(current_line + " " + word) <= max_chars_per_line:
                        current_line += (" " + word) if current_line else word
                    else:
                        if current_line:
                            lines.append(current_line)
                        current_line = word
                
                if current_line:
                    lines.append(current_line)
                
                # Create multi-line bullet text with proper alignment
                bullet_text_content = "• " + lines[0] + ("\\n  " + "\\n  ".join(lines[1:]) if len(lines) > 1 else "")
            else:
                bullet_text_content = f"• {{bullet_content}}"
            
            bullet_text = Text(bullet_text_content, font_size=24, color=WHITE)
            # Better positioning: start below title and use much tighter spacing
            bullet_text.move_to(UP * (0.8 - i * 0.4))
            bullet_text.align_to(LEFT * 3, LEFT)  # Align all bullets to the left
            bullet_objects.append(bullet_text)
        
        # Animate bullet points appearing one by one
        for i, bullet_obj in enumerate(bullet_objects):
            # Highlight effect - make it yellow briefly, then white
            bullet_obj.set_color(YELLOW)
            self.play(
                Write(bullet_obj), 
                run_time=timing.get("bullet_appear_duration", 1.0)
            )
            self.wait(timing.get("bullet_highlight_duration", 2.0))
            
            # Change to normal color
            self.play(
                bullet_obj.animate.set_color(WHITE),
                run_time=0.3
            )
            self.wait(timing.get("pause_between_bullets", 0.5))
        
        # Keep all bullets visible for final pause
        self.wait(timing.get("final_pause", 2.0))
'''
    
    # Write the temporary scene file
    with open(temp_scene_file, 'w') as f:
        f.write(scene_code)
    
    try:
        # Render the video using manim
        os.system(f"manim -qm {temp_scene_file} TextBulletScene")
        
        # The rendered video will be in media/videos/temp_text_scene/720p30/TextBulletScene.mp4
        rendered_path = "media/videos/temp_text_scene/720p30/TextBulletScene.mp4"
        
        if os.path.exists(rendered_path):
            # If we have audio, combine it with the video
            if audio_filename and os.path.exists(audio_filename):
                from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip
                
                video_clip = VideoFileClip(rendered_path)
                audio_clip = AudioFileClip(audio_filename)
                
                # Extend the shorter one to match the longer duration
                if video_clip.duration < audio_clip.duration:
                    # Extend video by freezing the last frame
                    from moviepy import ImageClip
                    last_frame = video_clip.get_frame(video_clip.duration)
                    freeze_frame = ImageClip(last_frame, duration=audio_clip.duration - video_clip.duration)
                    from moviepy import concatenate_videoclips
                    video_clip = concatenate_videoclips([video_clip, freeze_frame])
                elif audio_clip.duration < video_clip.duration:
                    # Extend audio by adding silence
                    from moviepy import AudioArrayClip
                    import numpy as np
                    silence_duration = video_clip.duration - audio_clip.duration
                    silence = AudioArrayClip(np.zeros((int(silence_duration * audio_clip.fps), audio_clip.nchannels)), 
                                           fps=audio_clip.fps)
                    from moviepy import concatenate_audioclips
                    audio_clip = concatenate_audioclips([audio_clip, silence])
                # If durations are equal, no adjustment needed
                
                final_video = video_clip.with_audio(audio_clip)
                final_video.write_videofile(output_filename, codec='libx264', audio_codec='aac')
                
                # Clean up
                video_clip.close()
                audio_clip.close()
                final_video.close()
            else:
                # Just copy the rendered video
                import shutil
                shutil.copy(rendered_path, output_filename)
            
            print(f"Video created successfully: {output_filename}")
            
            # Upload to Cloudinary if requested
            if upload_to_cloudinary_flag:
                cloudinary_link = upload_to_cloudinary(output_filename)
                if cloudinary_link:
                    print(f"🔗 Shareable link: {cloudinary_link}")
                    # Delete local file after successful upload
                    try:
                        os.remove(output_filename)
                        print(f"🗑️ Local video file deleted after successful upload")
                        return {"local_path": None, "cloudinary_link": cloudinary_link}
                    except Exception as e:
                        print(f"⚠️ Warning: Could not delete local file {output_filename}: {str(e)}")
                        return {"local_path": output_filename, "cloudinary_link": cloudinary_link}
                else:
                    print("Upload failed, but video is available locally")
                    return {"local_path": output_filename, "cloudinary_link": None}
            else:
                return {"local_path": output_filename, "cloudinary_link": None}
        else:
            print("Error: Rendered video not found")
            return None
    
    finally:
        # Clean up temporary files
        if os.path.exists(temp_scene_file):
            os.remove(temp_scene_file)
        if audio_filename and os.path.exists(audio_filename):
            os.remove(audio_filename)


# Example usage
if __name__ == "__main__":
    result = create_text_bullet_video_from_json("example_text_script.json", "text_bullet_video.mp4")
    if result and result["cloudinary_link"]:
        print(f"\n🎬 Your video is ready!")
        print(f"📁 Local file: {result['local_path']}")
        print(f"🌐 Share this link: {result['cloudinary_link']}")
    elif result:
        print(f"\n🎬 Video created locally: {result['local_path']}")
    else:
        print("❌ Video creation failed")
