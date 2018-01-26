import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'

class App extends Component {
    render() {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}>
                <Condition />
            </div>
        )
    }
}

class Condition extends Component {
    constructor(props) {
        super(props)
        this.like = '1..........'
        this.search;
    }

    onLikeChange = (like) => {
        this.like = like.replace(' ', '.')
    }
    onLikeEnd = () => {
        this.search.focus()
    }

    onSearch = () => {
        (async () => {
            const datas = await fetch(`http://10086.walfud.com/api/num?like=${this.like}`)
                .then(res => res.json())

            console.log(datas)
        })()
    }

    render() {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
            }}>
                <div style={{
                    display: 'flex',
                    flex: 8,
                    flexDirection: 'column',
                }}>
                    <Like
                        onChange={this.onLikeChange}
                        onEnd={this.onLikeEnd}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    flex: 2,
                }}>
                    <button
                        onClick={this.onSearch}
                        ref={btn => this.search = btn}
                    >
                        Secondary
                    </button>
                </div>
            </div>
        )
    }
}

class Like extends Component {
    constructor(props) {
        super(props)
        this.state = {
            num: '1          ',
        }
        this.inputs = {}
    }

    onChange = (index, oldValue, newValue) => {
        // 控制输入为一个数字
        const diffValue = newValue.replace(oldValue, '')
        if (!/^\d|\s$/.test(diffValue)) {
            return
        }

        // 文字
        const newNumArr = this.state.num.split('')
        newNumArr[index] = diffValue
        const newNum = newNumArr.join('')
        this.setState({
            num: newNum,
        })

        // Focus
        if (this.inputs.hasOwnProperty(index + 1)) {
            const nextInput = this.inputs[index + 1]
            nextInput.focus()
        } else {
            this.props.onEnd && this.props.onEnd()
        }

        // 回调
        this.props.onChange && this.props.onChange(newNum)
    }

    render() {
        const child = this.state.num.split('').map((ele, index) => <input
            style={{
                display: 'flex',
                flex: 1,
                minWidth: 10,
                maxWidth: 60,
                maxLength: 1,
                type: 'number',
            }}
            key={index}
            value={this.state.num[index]}
            onChange={(event) => { this.onChange(index, ele, event.target.value) }}
            ref={(input) => {
                this.inputs[index] = input
            }}
        />)

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
            }}>
                {child}
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
)