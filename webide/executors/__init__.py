# webide/executors/__init__.py

from .python_executor import execute_python
from .javascript_executor import execute_javascript
from .java_executor import execute_java
from .c_executor import execute_c

__all__ = ['execute_python', 'execute_javascript', 'execute_java', 'execute_c']