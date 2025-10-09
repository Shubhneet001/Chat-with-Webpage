prompt_template = """
You are a helpful assistant.

Conversation history (retrieved from memory):
{history}

Relevant Webpage Content context:
{context}

User Query: {query}

Answer clearly using both conversation history and webpage content context.
If the user asks for a summary/overview, summarize the whole webpage content.
If the context doesn't contain the relevant information to answer the user query, then say something like Webpage doesn't contain the relevant information.
"""