#!/usr/bin/env python3
"""
Simple test script to verify Cloudinary video upload functionality.
This script creates a minimal test video and uploads it to Cloudinary.
"""

import os
import sys
import json
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from app.agent.video.text_bullet_video import upload_to_cloudinary, create_text_bullet_video_from_json
import app.constants as constants

def check_cloudinary_config():
    """Check if Cloudinary credentials are configured."""
    print("🔍 Checking Cloudinary configuration...")
    
    missing_vars = []
    if not constants.CLOUDINARY_CLOUD_NAME:
        missing_vars.append("CLOUDINARY_CLOUD_NAME")
    if not constants.CLOUDINARY_API_KEY:
        missing_vars.append("CLOUDINARY_API_KEY")
    if not constants.CLOUDINARY_API_SECRET:
        missing_vars.append("CLOUDINARY_API_SECRET")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("\n📝 Please set these in your .env file:")
        for var in missing_vars:
            print(f"   {var}=your_value_here")
        return False
    
    print("✅ Cloudinary configuration found!")
    print(f"   Cloud Name: {constants.CLOUDINARY_CLOUD_NAME}")
    print(f"   API Key: {constants.CLOUDINARY_API_KEY[:8]}...")
    return True

def create_test_script():
    """Create a simple test video script."""
    test_script = {
        "title": "Cloudinary Upload Test",
        "bullets": [
            {"text": "Testing Cloudinary integration"},
            {"text": "This is a simple test video"},
            {"text": "Upload functionality verification"}
        ],
        "audio": {
            "narration": "This is a test video to verify that our Cloudinary upload functionality is working correctly. We are testing the integration between our video generation system and Cloudinary's video hosting service.",
            "language": "en"
        },
        "timing": {
            "bullet_appear_duration": 1.0,
            "bullet_highlight_duration": 2.0,
            "pause_between_bullets": 0.5,
            "final_pause": 2.0
        }
    }
    
    script_file = "test_cloudinary_script.json"
    with open(script_file, 'w') as f:
        json.dump(test_script, f, indent=2)
    
    print(f"📝 Created test script: {script_file}")
    return script_file

def test_direct_upload():
    """Test uploading an existing video file directly."""
    print("\n🧪 Testing direct video upload...")
    
    # Look for any existing video files to test with
    video_extensions = ['.mp4', '.mov', '.avi']
    test_files = []
    
    for ext in video_extensions:
        test_files.extend(Path('.').glob(f'*{ext}'))
        test_files.extend(Path('media/videos').glob(f'**/*{ext}'))
    
    if test_files:
        test_file = str(test_files[0])
        print(f"📹 Found test video: {test_file}")
        
        result = upload_to_cloudinary(test_file)
        if result:
            print(f"✅ Direct upload successful!")
            print(f"🔗 Cloudinary URL: {result}")
            return True
        else:
            print("❌ Direct upload failed")
            return False
    else:
        print("⚠️ No existing video files found for direct upload test")
        return None

def test_full_video_creation():
    """Test the complete video creation and upload process."""
    print("\n🎬 Testing full video creation and upload...")
    
    script_file = create_test_script()
    
    try:
        print("🎥 Creating video with Cloudinary upload...")
        result = create_text_bullet_video_from_json(
            script_file, 
            output_filename="cloudinary_test_video.mp4",
            upload_to_cloudinary_flag=True
        )
        
        if result:
            if result.get("cloudinary_link"):
                print("✅ Full video creation and upload successful!")
                print(f"🔗 Cloudinary URL: {result['cloudinary_link']}")
                print(f"📁 Local file: {result.get('local_path', 'Deleted after upload')}")
                return True
            elif result.get("local_path"):
                print("⚠️ Video created but upload failed")
                print(f"📁 Local file: {result['local_path']}")
                return False
        else:
            print("❌ Video creation failed")
            return False
            
    except Exception as e:
        print(f"❌ Error during video creation: {str(e)}")
        return False
    
    finally:
        # Clean up test script
        if os.path.exists(script_file):
            os.remove(script_file)
            print(f"🗑️ Cleaned up test script: {script_file}")

def main():
    """Main test function."""
    print("🚀 Cloudinary Upload Test Script")
    print("=" * 40)
    
    # Check configuration
    if not check_cloudinary_config():
        print("\n❌ Cannot proceed without proper Cloudinary configuration")
        return False
    
    # Test direct upload if possible
    direct_result = test_direct_upload()
    
    # Test full video creation
    full_result = test_full_video_creation()
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 Test Results Summary:")
    
    if direct_result is True:
        print("✅ Direct upload: PASSED")
    elif direct_result is False:
        print("❌ Direct upload: FAILED")
    else:
        print("⚠️ Direct upload: SKIPPED (no test files)")
    
    if full_result:
        print("✅ Full video creation: PASSED")
    else:
        print("❌ Full video creation: FAILED")
    
    overall_success = (direct_result != False) and full_result
    
    if overall_success:
        print("\n🎉 All tests passed! Cloudinary integration is working.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
    
    return overall_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
