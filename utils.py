# utils.py
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter, Language
from langchain.vectorstores import FAISS
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain.memory import ConversationBufferMemory, VectorStoreRetrieverMemory, CombinedMemory
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.runnables import RunnableParallel, RunnableLambda, RunnablePassthrough
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
import traceback

load_dotenv()


class WebChatBot:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2')
        self.llm = HuggingFaceEndpoint(
            model="meta-llama/Llama-3.3-70B-Instruct",
            task="text-generation",
            temperature=0.3
        )
        self.model = ChatHuggingFace(llm=self.llm)

        self.vectorstore = None
        self.mmr_retriever = None
        self.retriever = None
        self.memory = None
        self.main_chain = None

    # ---------------- LOAD WEBPAGE ----------------
    def load_webpage(self, url: str):
        try:
            # Step 1: Load webpage
            loader = WebBaseLoader(url)
            raw_html = loader.scrape()

            # Step 2: Remove unwanted tags
            for tag in raw_html([
                "script", "style", "nav", "footer", "header", "aside", "meta", "link",
                "noscript", "iframe", "form", "input", "button", "select", "textarea",
                "svg", "canvas", "img", "video", "audio", "source", "track",
                "advertisement", "ads",
            ]):
                tag.decompose()

            clean_html = str(raw_html)

            # Step 3: Remove tag attributes
            soup = BeautifulSoup(clean_html, "html.parser")
            for tag in soup.find_all(True):
                tag.attrs = {}
            clean_html = str(soup)

            # Step 4: Split into chunks
            html_splitter = RecursiveCharacterTextSplitter.from_language(
                language=Language.HTML, chunk_size=5000, chunk_overlap=1000
            )
            html_chunks = html_splitter.split_text(clean_html)

            clean_chunks = []
            for chunk in html_chunks:
                soup = BeautifulSoup(chunk, "html.parser")
                clean_chunk = soup.get_text(separator="---", strip=True)
                if len(clean_chunk) > 5:
                    clean_chunks.append(clean_chunk)

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000, chunk_overlap=200,
                separators=["---", "\n\n\n", "\n\n", "\n", ".", " ", ""]
            )
            modified_chunks = []
            for text in clean_chunks:
                modified_chunks.extend(splitter.split_text(text))
            chunks = [text.replace("---", " ") for text in modified_chunks]

            # Step 5: Create FAISS vectorstore
            self.vectorstore = FAISS.from_texts(chunks, self.embeddings)

            # Step 6: Create retrievers
            self.mmr_retriever = self.vectorstore.as_retriever(
                search_type="mmr",
                search_kwargs={'k': 5, 'fetch_k': 10, 'lambda_mult': 0.7}
            )
            self.retriever = MultiQueryRetriever.from_llm(retriever=self.mmr_retriever, llm=self.model)

            # Step 7: Setup memory
            buffer_memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
            memory_store = FAISS.from_texts([""], self.embeddings)
            memory_retriever = memory_store.as_retriever(
                search_type="mmr", search_kwargs={'k': 5, 'fetch_k': 10, 'lambda_mult': 0.7}
            )
            vector_memory = VectorStoreRetrieverMemory(retriever=memory_retriever)
            self.memory = CombinedMemory(memories=[buffer_memory, vector_memory])

            # Step 8: Build main chain
            def format_docs(retrieved_docs):
                return "\n\n".join(f"[Chunk {i}] {doc.page_content}" for i, doc in enumerate(retrieved_docs, 1))

            def get_history(query: str):
                history_vars = self.memory.load_memory_variables({'input': query})
                history = history_vars.get("chat_history", [])
                if isinstance(history, list):
                    formatted_history = "\n".join(f"{msg.type.upper()}: {msg.content}" for msg in history)
                else:
                    formatted_history = history
                return formatted_history

            prompt_template = """
            You are a helpful assistant.
            You give concise answers.

            Conversation history (retrieved from memory):
            {history}

            Relevant Webpage Content context:
            {context}

            User Query: {query}

            Answer should be in HTML format.
            Answer clearly using both conversation history and webpage content context.
            If the user asks for a summary/overview, summarize the whole webpage content.
            Don't mention where or how in the hostory you are getting the information from, just answer what the user needs.
            If the query conntains pronouns that you cannot interpret what is referring to, then consider the most recent conversation history to interpret them.
            If the context doesn't contain the relevant information to answer the user query, then say something like Webpage doesn't contain the relevant information.
            """
            prompt = PromptTemplate(template=prompt_template, input_variables=["history", "context", "query"])
            parser = StrOutputParser()

            parallel_chain = RunnableParallel({
                'history': RunnableLambda(get_history),
                'context': self.retriever | RunnableLambda(format_docs),
                'query': RunnablePassthrough()
            })
            self.main_chain = parallel_chain | prompt | self.model | parser

            return {"status": "success", "message": "Webpage loaded and indexed successfully."}

        except Exception as e:
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    # ---------------- ASK ----------------
    def ask(self, query: str):
        try:
            if not self.main_chain:
                raise RuntimeError("Webpage not loaded yet. Please call /load_webpage first.")

            answer = self.main_chain.invoke(query)

            # Save memory
            for mem in self.memory.memories:
                if hasattr(mem, "save_context"):
                    mem.save_context({"input": query}, {"output": answer})

            return {"answer": answer}

        except Exception as e:
            traceback.print_exc()
            return {"error": f"Failed to answer query: {str(e)}"}

    # ---------------- RESET ----------------
    def reset_history(self):
        try:
            buffer_memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
            memory_store = FAISS.from_texts([""], self.embeddings)
            memory_retriever = memory_store.as_retriever(
                search_type="mmr", search_kwargs={'k': 5, 'fetch_k': 10, 'lambda_mult': 0.7}
            )
            vector_memory = VectorStoreRetrieverMemory(retriever=memory_retriever)
            self.memory = CombinedMemory(memories=[buffer_memory, vector_memory])
            return {"status": "success", "message": "Memory reset successful."}
        except Exception as e:
            traceback.print_exc()
            return {"status": "error", "message": str(e)}
