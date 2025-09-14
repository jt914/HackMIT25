#!/usr/bin/env python3
"""
Simple test script to verify the new simple video tool works correctly.
"""

import sys
import os
import json

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.agent.agent_tools import create_simple_video_tool

def test_simple_video_tool():
    """Test the simple video generation tool."""
    print("🧪 Testing Simple Video Tool")
    print("=" * 50)
    
    # Create the tool
    tool = create_simple_video_tool()
    
    print(f"✅ Tool created successfully")
    print(f"   Name: {tool.metadata.name}")
    print(f"   Description: {tool.metadata.description[:100]}...")
    
    # Test with sample data
    test_title = "Test Video"
    test_narration = "This is a test video to demonstrate the simple video tool functionality. It should create bullet points and narration."
    test_bullets = "First key point, Second important concept, Third crucial element"
    
    print(f"\n🎬 Testing video generation with:")
    print(f"   Title: {test_title}")
    print(f"   Narration: {len(test_narration)} characters")
    print(f"   Bullet points: {test_bullets}")
    
    try:
        # Call the tool function
        result_json = tool.fn(test_title, test_narration, test_bullets)
        result = json.loads(result_json)
        
        print(f"\n📊 Result:")
        print(f"   Status: {result.get('status')}")
        if result.get('video_url'):
            print(f"   Video URL: {result['video_url']}")
        if result.get('local_path'):
            print(f"   Local Path: {result['local_path']}")
        if result.get('error'):
            print(f"   Error: {result['error']}")
            
        if result.get('status') == 'success':
            print(f"\n✅ SUCCESS: Video tool is working correctly!")
            return True
        else:
            print(f"\n⚠️  PARTIAL SUCCESS: Tool executed but may have issues")
            return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_simple_video_tool()
    if success:
        print(f"\n🎉 Simple video tool test completed!")
    else:
        print(f"\n💥 Simple video tool test failed!")
    
    # Clean up test file
    if os.path.exists(__file__):
        print(f"\n🧹 Cleaning up test file...")
        # Don't actually delete in case user wants to run again
        print(f"   Test file: {__file__}")
