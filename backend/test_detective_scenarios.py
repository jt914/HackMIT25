#!/usr/bin/env python3
"""
Test script for detective scenario generation in lessons.
"""

import asyncio
import sys
import os

# Add the backend app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.lesson_service import LessonGeneratorService


async def test_detective_scenario_generation():
    """Test generating a lesson with a detective scenario."""
    
    print("🧪 Testing detective scenario generation...")
    
    # Initialize the lesson service
    service = LessonGeneratorService(username="test_user")
    
    # Test query
    test_query = "authentication"
    test_email = "test@example.com"
    
    try:
        # Generate a detective scenario directly
        print(f"\n🕵️ Generating detective scenario for: {test_query}")
        detective_slide = await service._generate_detective_scenario(test_query, test_email)
        
        if detective_slide:
            print("✅ Detective scenario generated successfully!")
            print(f"📝 Title: {detective_slide.title}")
            print(f"🔍 Problem: {detective_slide.problem_description[:100]}...")
            print(f"📋 Context: {detective_slide.problem_context[:100]}...")
            print(f"💡 Solution: {detective_slide.solution[:100]}...")
            print(f"🎯 Hints: {len(detective_slide.hints)} hints available")
            print(f"🆔 ID: {detective_slide.id}")
            print(f"🎮 State: {detective_slide.current_state}")
        else:
            print("❌ Failed to generate detective scenario")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_full_lesson_generation():
    """Test generating a complete lesson with detective scenario."""
    
    print("\n🧪 Testing full lesson generation with detective scenario...")
    
    # Initialize the lesson service
    service = LessonGeneratorService(username="test_user")
    
    # Test query
    test_query = "API design"
    test_email = "test@example.com"
    
    try:
        print(f"\n📚 Generating lesson for: {test_query}")
        lesson = await service.generate_lesson(test_query, test_email)
        
        if lesson:
            print("✅ Lesson generated successfully!")
            print(f"📝 Title: {lesson.title}")
            print(f"📋 Description: {lesson.description}")
            print(f"📊 Total slides: {len(lesson.slides)}")
            
            # Check if detective scenario was added
            detective_slides = [slide for slide in lesson.slides if slide.type == "interactive_investigation"]
            
            if detective_slides:
                print(f"🕵️ Detective scenarios found: {len(detective_slides)}")
                for i, slide in enumerate(detective_slides):
                    print(f"  🔍 Detective {i+1}: {slide.title}")
            else:
                print("⚠️ No detective scenarios found in lesson")
            
            # Show slide types
            slide_types = [slide.type for slide in lesson.slides]
            print(f"🎯 Slide types: {slide_types}")
        else:
            print("❌ Failed to generate lesson")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error during lesson generation test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests."""
    print("🚀 Starting detective scenario tests...\n")
    
    # Test 1: Generate detective scenario directly
    test1_success = await test_detective_scenario_generation()
    
    # Test 2: Generate full lesson with detective scenario
    test2_success = await test_full_lesson_generation()
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    print(f"🕵️ Detective scenario generation: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"📚 Full lesson generation: {'✅ PASS' if test2_success else '❌ FAIL'}")
    
    if test1_success and test2_success:
        print("\n🎉 All tests passed! Detective scenarios are working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
