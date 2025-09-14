import asyncio
# from api_clients.mongo import mongo_client
from api_clients.slack_client import SlackClient
import constants as constants

# mongo_client.update_user_integrations("josephtso914@gmail.com", "github", True)

# username = mongo_client.get_username_by_email("josephtso914@gmail.com")
# print(username)

# mongo_client.set_linear_api_key(
#     email="josephtso914@gmail.com", api_key=constants.LINEAR_API_KEY
# )
# print(mongo_client.get_linear_api_key(email="josephtso914@gmail.com"))

# from app.agent.agent import Agent
# agent = Agent(username="josephtso914")
# print(asyncio.run(agent.query("Generate me a simple json formatted lesson about how user data gets stored in the database, and everthing I need to know about the database schema. Use tools to get context about my specific codebase.")))

slack_client = SlackClient(api_key=constants.SLACK_API_KEY)
print(asyncio.run(slack_client.fetch_channel_messages(channel_id="C093X7X7DS9")))



# for team_id in asyncio.run(linear_client.get_team_ids()):
#     print(team_id)
#     print("--------------------------------")
#     for ticket in asyncio.run(linear_client.fetch_team_tickets(team_id)):
#         print(ticket)


# linear_ingestion = LinearTicketIngester(username="josephtso914")
# asyncio.run(linear_ingestion.ingest_tickets())
