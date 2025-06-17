/* eslint-disable prettier/prettier */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { client } from './utils/fetchClient';
import { Todo } from './types.ts'; // Corrigido: Adicionada a extensão

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!USER_ID) {
    return <UserWarning />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setLoadingAction('load');
    client
      .get<Todo[]>('/todos')
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setLoadingAction(null));
  }, []);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTodoTitle.trim()) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setLoadingAction('add');
    client
      .post<Todo>('/todos', {
      userId: USER_ID,
      title: newTodoTitle,
      completed: false,
    })
      .then(newTodo => {
        setTodos(prev => [...prev, newTodo]);
        setNewTodoTitle('');
      })
      .catch(() => setErrorMessage('Unable to add a todo'))
      .finally(() => setLoadingAction(null));
  };

  const handleDeleteTodo = (id: number) => {
    setLoadingAction(`delete-${id}`);
    client
      .delete(`/todos/${id}`)
      .then(() => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      })
      .catch(() => setErrorMessage('Unable to delete a todo'))
      .finally(() => setLoadingAction(null));
  };

  const handleToggleTodo = (todo: Todo) => {
    setLoadingAction(`toggle-${todo.id}`);
    client
      .patch<Todo>(`/todos/${todo.id}`, {
      ...todo,
      completed: !todo.completed,
    })
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(t => (t.id === updatedTodo.id ? updatedTodo : t)),
        );
      })
      .catch(() => setErrorMessage('Unable to update a todo'))
      .finally(() => setLoadingAction(null));
  };

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const hasCompletedTodos = todos.some(todo => todo.completed);

  const clearCompleted = () => {
    setLoadingAction('clear');
    Promise.all(
      todos
        .filter(todo => todo.completed)
        .map(todo => client.delete(`/todos/${todo.id}`)),
    )
      .then(() => {
        setTodos(prev => prev.filter(todo => !todo.completed));
      })
      .catch(() => setErrorMessage('Unable to clear completed todos'))
      .finally(() => setLoadingAction(null));
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${activeTodosCount === 0 ? 'active' : ''}`}
            data-cy="ToggleAllButton"
            onClick={() => {
              const updatedTodos = todos.map(todo => ({
                ...todo,
                completed: activeTodosCount > 0,
              }));

              setLoadingAction('toggle-all');
              Promise.all(
                updatedTodos.map(todo =>
                  client.patch<Todo>(`/todos/${todo.id}`, todo),
                ),
              )
                .then(() => setTodos(updatedTodos))
                .catch(() => setErrorMessage('Unable to toggle all todos'))
                .finally(() => setLoadingAction(null));
            }}
          />

          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={loadingAction !== null}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {todos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo)}
                  disabled={loadingAction === `toggle-${todo.id}`}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={loadingAction === `delete-${todo.id}`}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      </div>

      {todos.length > 0 && (
        <div className="todoapp__content">
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeTodosCount} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className="filter__link selected"
                data-cy="FilterLinkAll"
              >
                All
              </a>
              <a
                href="#/active"
                className="filter__link"
                data-cy="FilterLinkActive"
              >
                Active
              </a>
              <a
                href="#/completed"
                className="filter__link"
                data-cy="FilterLinkCompleted"
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={clearCompleted}
              disabled={!hasCompletedTodos || loadingAction === 'clear'}
            >
              Clear completed
            </button>
          </footer>
        </div>
      )}

      {errorMessage && (
        <div
          data-cy="ErrorNotification"
          className="notification is-danger is-light has-text-weight-normal"
        >
          <button
            type="button"
            className="delete"
            onClick={() => setErrorMessage('')}
          />
          {errorMessage}
        </div>
      )}
    </div>
  );
};
